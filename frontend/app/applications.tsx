import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  closeApplication,
  createApplication,
  createIdempotencyKey,
  getApplications,
  recordStageEvent,
  revertStageEvent,
  searchCompanies,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import { ActiveApplicationCard } from '@/components/applications/ActiveApplicationCard';
import { ClosedApplicationCard } from '@/components/applications/ClosedApplicationCard';
import {
  ApplicationComposer,
  type NewApplication,
} from '@/components/applications/ApplicationComposer';

// 회사별 지원 단계 기록 화면. 포인트는 단계 유형별 고정이고, 기록했을 때만 지급된다.
export default function ApplicationsScreen() {
  const [token, setToken] = useState<string | null>();
  const [composerVisible, setComposerVisible] = useState(false);
  // 열 때마다 키를 바꿔 시트를 새로 마운트해 입력값을 초기화한다.
  const [composerKey, setComposerKey] = useState(0);
  const queryClient = useQueryClient();
  const { palette } = useTheme();

  const openComposer = () => {
    setComposerKey((current) => current + 1);
    setComposerVisible(true);
  };

  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);

  const applicationsQuery = useQuery({
    queryKey: ['applications'],
    queryFn: () => getApplications(token!),
    enabled: Boolean(token),
  });

  const refreshAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['applications'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['history'] }),
      queryClient.invalidateQueries({ queryKey: ['badges'] }),
    ]);

  const record = useMutation({
    mutationFn: ({ applicationId, stageId }: { applicationId: string; stageId: string }) =>
      recordStageEvent(token!, applicationId, stageId, createIdempotencyKey()),
    onSuccess: refreshAll,
  });
  const revert = useMutation({
    mutationFn: (stageEventId: string) => revertStageEvent(token!, stageEventId),
    onSuccess: refreshAll,
  });
  const close = useMutation({
    mutationFn: (input: { applicationId: string; status: 'rejected' | 'withdrawn' }) =>
      closeApplication(token!, input.applicationId, input.status),
    onSuccess: refreshAll,
  });
  const add = useMutation({
    mutationFn: (input: NewApplication) =>
      createApplication(token!, {
        company: input.company,
        companyId: input.companyId ?? undefined,
        title: input.title || undefined,
        memo: input.memo || undefined,
      }),
    onSuccess: () => {
      setComposerVisible(false);
      refreshAll();
    },
  });

  const applications = applicationsQuery.data?.applications ?? [];
  const stages = applicationsQuery.data?.stages ?? [];
  const active = applications.filter((application) => application.status === 'active');
  const closed = applications.filter((application) => application.status !== 'active');
  const busy = record.isPending || revert.isPending || close.isPending;
  const error =
    record.error?.message ??
    revert.error?.message ??
    close.error?.message ??
    add.error?.message ??
    null;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="px-5 pb-8 pt-6">
        <Pressable onPress={() => router.back()} className="min-h-11 justify-center">
          <Text className="text-sm" style={{ color: palette.accent }}>
            {t('tasks.back')}
          </Text>
        </Pressable>
        <View className="mt-3 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-bold text-[#26332D]">{t('applications.title')}</Text>
            <Text className="mt-2 text-sm text-muted">{t('applications.stages.subtitle')}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/application-stages')}
            className="min-h-11 items-center justify-center rounded-full border border-line px-3.5">
            <Text className="text-xs font-bold" style={{ color: palette.accent }}>
              {t('applications.stagesAction')}
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={openComposer}
          style={{ backgroundColor: palette.accent }}
          className="mt-6 h-12 items-center justify-center rounded-2xl transition duration-150 hover:-translate-y-px hover:opacity-90">
          <Text className="font-bold text-white">{t('applications.add')}</Text>
        </Pressable>

        {applications.length === 0 && !applicationsQuery.isLoading ? (
          <View className="mt-4 rounded-2xl border border-line bg-surface p-5">
            <Text className="text-sm text-muted">{t('applications.empty')}</Text>
            <Pressable
              onPress={openComposer}
              className="mt-4 h-11 items-center justify-center rounded-xl border border-line">
              <Text className="text-sm font-bold text-[#26332D]">{t('applications.emptyCta')}</Text>
            </Pressable>
          </View>
        ) : null}

        {active.length > 0 ? (
          <Text className="mt-6 text-[11px] font-bold tracking-[1.5px] text-meta">
            {t('applications.sectionActive')}
          </Text>
        ) : null}
        <View className="mt-3 gap-3">
          {active.map((application) => (
            <ActiveApplicationCard
              key={application.id}
              application={application}
              stages={stages}
              busy={busy}
              onRecord={(stageId) => record.mutate({ applicationId: application.id, stageId })}
              onRevert={(stageEventId) => revert.mutate(stageEventId)}
              onClose={(status) => close.mutate({ applicationId: application.id, status })}
            />
          ))}
        </View>

        {closed.length > 0 ? (
          <Text className="mt-6 text-[11px] font-bold tracking-[1.5px] text-meta">
            {t('applications.sectionClosed')}
          </Text>
        ) : null}
        <View className="mt-3 gap-3">
          {closed.map((application) => (
            <ClosedApplicationCard key={application.id} application={application} />
          ))}
        </View>

        {error ? <Text className="mt-4 text-sm text-[#FF9BA6]">{error}</Text> : null}
      </ScrollView>

      <ApplicationComposer
        key={composerKey}
        visible={composerVisible}
        saving={add.isPending}
        error={add.error?.message ?? null}
        onClose={() => setComposerVisible(false)}
        onSearch={async (query) => (token ? (await searchCompanies(token, query)).data : [])}
        onConfirm={(input) => add.mutate(input)}
      />
    </SafeAreaView>
  );
}
