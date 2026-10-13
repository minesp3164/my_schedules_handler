import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createApplicationStage,
  deactivateApplicationStage,
  getApplicationStages,
  updateApplicationStage,
  type ApplicationStage,
  type ApplicationStageKind,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

const KINDS: ApplicationStageKind[] = ['submission', 'interview', 'pass'];

// 단계는 사용자가 이름·순서·추가·삭제를 정하고, 포인트는 유형별로 고정이다.
export default function ApplicationStagesScreen() {
  const [token, setToken] = useState<string | null>();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ApplicationStageKind>('interview');
  const [renaming, setRenaming] = useState<ApplicationStage | null>(null);
  const queryClient = useQueryClient();
  const { palette } = useTheme();

  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);

  const stages = useQuery({
    queryKey: ['application-stages'],
    queryFn: () => getApplicationStages(token!),
    enabled: Boolean(token),
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['application-stages'] }),
      queryClient.invalidateQueries({ queryKey: ['applications'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);

  const add = useMutation({
    mutationFn: () => createApplicationStage(token!, { name: name.trim(), kind }),
    onSuccess: () => {
      setName('');
      setKind('interview');
      refresh();
    },
  });
  const rename = useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      updateApplicationStage(token!, input.id, input.name),
    onSuccess: () => {
      setRenaming(null);
      refresh();
    },
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => deactivateApplicationStage(token!, id),
    onSuccess: refresh,
  });

  const list = stages.data ?? [];
  const activeStages = list.filter((stage) => stage.active);
  const inactiveStages = list.filter((stage) => !stage.active);
  const error = add.error?.message ?? rename.error?.message ?? deactivate.error?.message ?? null;
  const busy = add.isPending || rename.isPending || deactivate.isPending;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="px-5 pb-8 pt-6">
        <Pressable onPress={() => router.back()} className="min-h-11 justify-center">
          <Text className="text-sm" style={{ color: palette.accent }}>
            {t('tasks.back')}
          </Text>
        </Pressable>
        <Text className="mt-3 text-2xl font-bold text-[#26332D]">
          {t('applications.stages.title')}
        </Text>
        <Text className="mt-2 text-sm text-muted">{t('applications.stages.subtitle')}</Text>

        {/* 단계 추가: 유형을 고르면 고정 포인트가 보인다. */}
        <View className="mt-6 rounded-2xl border border-line bg-surface p-4">
          <Text className="text-xs font-bold text-meta">{t('applications.stages.nameLabel')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('applications.stages.namePlaceholder')}
            placeholderTextColor="#AAB0B6"
            className="mt-1.5 h-11 rounded-xl border border-line bg-white px-3 text-sm text-[#26332D]"
          />
          <Text className="mt-3 text-xs font-bold text-meta">
            {t('applications.stages.kindLabel')}
          </Text>
          <View className="mt-1.5 flex-row gap-2">
            {KINDS.map((item) => {
              const selected = kind === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setKind(item)}
                  style={{
                    backgroundColor: selected ? palette.accentSoft : '#FFFFFF',
                    borderColor: selected ? palette.accent : '#E7E9EC',
                  }}
                  className="min-h-14 flex-1 items-center justify-center rounded-xl border px-1">
                  <Text
                    className="text-xs font-bold"
                    style={{ color: selected ? palette.accent : '#26332D' }}>
                    {t(`applications.stages.kinds.${item}`)}
                  </Text>
                  <Text className="mt-0.5 text-[10px] text-muted">
                    {t('applications.stages.points', {
                      count: ApplicationStagePoints[item],
                    })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="mt-1.5 text-[11px] text-muted">
            {t(`applications.stages.kindHints.${kind}`)}
          </Text>
          <Pressable
            disabled={!name.trim() || busy}
            onPress={() => add.mutate()}
            style={{
              backgroundColor: palette.accent,
              opacity: !name.trim() || busy ? 0.5 : 1,
            }}
            className="mt-4 h-11 items-center justify-center rounded-xl">
            <Text className="text-sm font-bold text-white">{t('applications.stages.add')}</Text>
          </Pressable>
        </View>

        <View className="mt-5 gap-3">
          {activeStages.map((stage) => (
            <View
              key={stage.id}
              className="flex-row items-center rounded-2xl border border-line bg-surface p-4">
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#26332D]">{stage.name}</Text>
                <Text className="mt-0.5 text-xs text-muted">
                  {t(`applications.stages.kinds.${stage.kind}`)}
                  {' · '}
                  {t('applications.stages.points', { count: stage.points })}
                </Text>
              </View>
              <Pressable
                disabled={busy}
                onPress={() => setRenaming(stage)}
                className="min-h-10 items-center justify-center px-2.5">
                <Text className="text-xs font-bold" style={{ color: palette.accent }}>
                  {t('applications.stages.rename')}
                </Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => deactivate.mutate(stage.id)}
                className="min-h-10 items-center justify-center pl-2.5">
                <Text className="text-xs font-bold text-[#FF9BA6]">
                  {t('applications.stages.deactivate')}
                </Text>
              </Pressable>
            </View>
          ))}
          {activeStages.length === 0 && !stages.isLoading ? (
            <Text className="text-sm text-muted">{t('applications.stages.empty')}</Text>
          ) : null}
        </View>

        {inactiveStages.length > 0 ? (
          <View className="mt-5 gap-2">
            {inactiveStages.map((stage) => (
              <View
                key={stage.id}
                className="flex-row items-center justify-between rounded-2xl border border-line px-4 py-3 opacity-60">
                <Text className="text-sm text-muted" numberOfLines={1}>
                  {stage.name}
                </Text>
                <Text className="text-[11px] font-bold text-muted">
                  {t('applications.stages.deactivated')}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {error ? <Text className="mt-4 text-sm text-[#FF9BA6]">{error}</Text> : null}
      </ScrollView>

      <RenameSheet
        key={renaming?.id ?? 'rename-closed'}
        stage={renaming}
        saving={rename.isPending}
        error={rename.error?.message ?? null}
        onClose={() => setRenaming(null)}
        onSave={(stageId, nextName) => rename.mutate({ id: stageId, name: nextName })}
      />
    </SafeAreaView>
  );
}

// 서버가 정한 유형별 고정 포인트와 같은 값(표시용).
const ApplicationStagePoints: Record<ApplicationStageKind, number> = {
  submission: 25,
  interview: 30,
  pass: 100,
};

function RenameSheet({
  stage,
  saving,
  error,
  onClose,
  onSave,
}: {
  stage: ApplicationStage | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (stageId: string, name: string) => void;
}) {
  const { palette } = useTheme();
  // key 리마운트로 열 때마다 선택된 단계 이름에서 시작한다.
  const [name, setName] = useState(stage?.name ?? '');

  return (
    <Modal visible={Boolean(stage)} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-5">
        <View className="w-full max-w-md rounded-3xl bg-white p-5">
          <Text className="text-lg font-bold text-[#26332D]">
            {t('applications.stages.renameTitle')}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            className="mt-4 h-11 rounded-xl border border-line px-3 text-sm text-[#26332D]"
          />
          {error ? <Text className="mt-3 text-xs text-[#FF9BA6]">{error}</Text> : null}
          <View className="mt-5 flex-row gap-2">
            <Pressable
              onPress={onClose}
              className="h-11 flex-1 items-center justify-center rounded-xl border border-line">
              <Text className="text-sm font-bold text-muted">{t('applications.cancel')}</Text>
            </Pressable>
            <Pressable
              disabled={!name.trim() || saving}
              onPress={() => stage && onSave(stage.id, name.trim())}
              style={{
                backgroundColor: palette.accent,
                opacity: !name.trim() || saving ? 0.5 : 1,
              }}
              className="h-11 flex-1 items-center justify-center rounded-xl">
              <Text className="text-sm font-bold text-white">{t('applications.save')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
