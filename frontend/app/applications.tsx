import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
  type Application,
  type ApplicationStage,
  type Company,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { formatDate, t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

type NewApplication = {
  company: string;
  companyId: string | null;
  title: string;
  memo: string;
};

const stagePoints = (points: number) => `+${t('common.point', { count: points })}`;

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

  // 순서상 아직 기록하지 않은 첫 활성 단계가 다음 단계다.
  const nextStageFor = (application: Application): ApplicationStage | null => {
    const recorded = new Set(application.stages.map((stage) => stage.stage_id));
    return stages.find((stage) => !recorded.has(stage.id)) ?? null;
  };

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
          {active.map((application) => {
            const nextStage = nextStageFor(application);
            return (
              <View key={application.id} className="rounded-2xl border border-line bg-surface p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-[15px] font-bold text-[#26332D]">
                      {application.company}
                    </Text>
                    {application.title ? (
                      <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
                        {application.title}
                      </Text>
                    ) : null}
                  </View>
                  <Text className="text-[11px] font-bold" style={{ color: palette.accent }}>
                    {t(`applications.status.${application.status}`)}
                  </Text>
                </View>

                <View className="mt-3 gap-1.5">
                  {application.stages.map((stage) => (
                    <View
                      key={stage.id}
                      className="flex-row items-center justify-between rounded-xl bg-white px-3 py-2">
                      <Text
                        className="flex-1 text-xs font-semibold text-[#26332D]"
                        numberOfLines={1}>
                        {t('applications.recorded', { name: stage.name })}
                      </Text>
                      <Text className="mr-2 text-xs font-bold" style={{ color: palette.accent }}>
                        {stagePoints(stage.points)}
                      </Text>
                      <Pressable
                        disabled={busy}
                        onPress={() => revert.mutate(stage.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t('applications.revertAccessibility', {
                          name: stage.name,
                        })}
                        className="min-h-8 items-center justify-center rounded-full border border-line px-2.5">
                        <Text className="text-[11px] font-bold text-muted">
                          {t('applications.revert')}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>

                {nextStage ? (
                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      record.mutate({ applicationId: application.id, stageId: nextStage.id })
                    }
                    style={{ backgroundColor: palette.accent }}
                    className="mt-3 min-h-11 items-center justify-center rounded-xl px-4">
                    <Text className="text-sm font-bold text-white">
                      {t('applications.nextStage', {
                        name: nextStage.name,
                        points: nextStage.points,
                      })}
                    </Text>
                  </Pressable>
                ) : (
                  <Text className="mt-3 text-xs text-muted">{t('applications.allRecorded')}</Text>
                )}

                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      close.mutate({ applicationId: application.id, status: 'rejected' })
                    }
                    className="min-h-9 flex-1 items-center justify-center rounded-xl border border-line">
                    <Text className="text-xs font-bold text-muted">
                      {t('applications.closeRejected')}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      close.mutate({ applicationId: application.id, status: 'withdrawn' })
                    }
                    className="min-h-9 flex-1 items-center justify-center rounded-xl border border-line">
                    <Text className="text-xs font-bold text-muted">
                      {t('applications.closeWithdrawn')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {closed.length > 0 ? (
          <Text className="mt-6 text-[11px] font-bold tracking-[1.5px] text-meta">
            {t('applications.sectionClosed')}
          </Text>
        ) : null}
        <View className="mt-3 gap-3">
          {closed.map((application) => (
            <View
              key={application.id}
              className="flex-row items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3.5">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-[#26332D]" numberOfLines={1}>
                  {application.company}
                </Text>
                {application.closed_at ? (
                  <Text className="mt-0.5 text-[11px] text-muted">
                    {t('applications.closedOn', {
                      date: formatDate(new Date(application.closed_at)),
                    })}
                  </Text>
                ) : null}
              </View>
              <Text className="text-[11px] font-bold text-muted">
                {t(`applications.status.${application.status}`)}
              </Text>
            </View>
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

// 지원 건 추가 시트. 회사명은 실존 목록에서 검색하거나 직접 입력할 수 있다.
function ApplicationComposer({
  visible,
  saving,
  error,
  onClose,
  onSearch,
  onConfirm,
}: {
  visible: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSearch: (query: string) => Promise<Company[]>;
  onConfirm: (input: NewApplication) => void;
}) {
  const { palette } = useTheme();
  const [company, setCompany] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [suggestions, setSuggestions] = useState<Company[]>([]);

  const trimmed = company.trim();

  useEffect(() => {
    let stale = false;
    const query = company.trim();
    if (!visible || !query || companyId) return;

    const timer = setTimeout(() => {
      onSearch(query)
        .then((list) => {
          if (stale) return;
          setSuggestions(list);
        })
        .catch(() => {
          if (stale) return;
          setSuggestions([]);
        });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [company, companyId, visible, onSearch]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-5">
        <View className="w-full max-w-md rounded-3xl bg-white p-5">
          <Text className="text-lg font-bold text-[#26332D]">{t('applications.addTitle')}</Text>

          <Text className="mt-4 text-xs font-bold text-meta">{t('applications.companyLabel')}</Text>
          <TextInput
            value={company}
            onChangeText={(text) => {
              setCompany(text);
              setCompanyId(null);
            }}
            placeholder={t('applications.companyPlaceholder')}
            placeholderTextColor="#AAB0B6"
            className="mt-1.5 h-11 rounded-xl border border-line px-3 text-sm text-[#26332D]"
          />
          {suggestions.length > 0 && !companyId ? (
            <View className="mt-1 max-h-32 overflow-hidden rounded-xl border border-line">
              {suggestions.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setCompany(item.name);
                    setCompanyId(item.id);
                    setSuggestions([]);
                  }}
                  className="min-h-10 justify-center border-b border-line px-3 last:border-b-0">
                  <Text className="text-xs text-[#26332D]">{item.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text className="mt-3 text-xs font-bold text-meta">{t('applications.titleLabel')}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            className="mt-1.5 h-11 rounded-xl border border-line px-3 text-sm text-[#26332D]"
          />

          <Text className="mt-3 text-xs font-bold text-meta">{t('applications.memoLabel')}</Text>
          <TextInput
            value={memo}
            onChangeText={setMemo}
            multiline
            className="mt-1.5 min-h-16 rounded-xl border border-line px-3 py-2 text-sm text-[#26332D]"
          />

          {error ? <Text className="mt-3 text-xs text-[#FF9BA6]">{error}</Text> : null}

          <View className="mt-5 flex-row gap-2">
            <Pressable
              onPress={onClose}
              className="h-11 flex-1 items-center justify-center rounded-xl border border-line">
              <Text className="text-sm font-bold text-muted">{t('applications.cancel')}</Text>
            </Pressable>
            <Pressable
              disabled={!trimmed || saving}
              onPress={() =>
                onConfirm({ company: trimmed, companyId, title: title.trim(), memo: memo.trim() })
              }
              style={{ backgroundColor: palette.accent, opacity: !trimmed || saving ? 0.5 : 1 }}
              className="h-11 flex-1 items-center justify-center rounded-xl">
              <Text className="text-sm font-bold text-white">
                {saving ? '…' : t('applications.save')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
