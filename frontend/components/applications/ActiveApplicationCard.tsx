import { Pressable, Text, View } from 'react-native';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import type { Application, ApplicationStage } from '@/services/api';

const stagePoints = (points: number) => `+${t('common.point', { count: points })}`;

// 순서상 아직 기록하지 않은 첫 활성 단계가 다음 단계다.
function nextStageFor(
  application: Application,
  stages: ApplicationStage[]
): ApplicationStage | null {
  const recorded = new Set(application.stages.map((stage) => stage.stage_id));
  return stages.find((stage) => !recorded.has(stage.id)) ?? null;
}

// 진행 중인 지원 건 카드: 기록된 단계 · 다음 단계 기록 · 마감 처리.
export function ActiveApplicationCard({
  application,
  stages,
  busy,
  onRecord,
  onRevert,
  onClose,
}: {
  application: Application;
  stages: ApplicationStage[];
  busy: boolean;
  onRecord: (stageId: string) => void;
  onRevert: (stageEventId: string) => void;
  onClose: (status: 'rejected' | 'withdrawn') => void;
}) {
  const { palette } = useTheme();
  const nextStage = nextStageFor(application, stages);
  return (
    <View className="rounded-2xl border border-line bg-surface p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[15px] font-bold text-[#26332D]">{application.company}</Text>
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
            <Text className="flex-1 text-xs font-semibold text-[#26332D]" numberOfLines={1}>
              {t('applications.recorded', { name: stage.name })}
            </Text>
            <Text className="mr-2 text-xs font-bold" style={{ color: palette.accent }}>
              {stagePoints(stage.points)}
            </Text>
            <Pressable
              disabled={busy}
              onPress={() => onRevert(stage.id)}
              accessibilityRole="button"
              accessibilityLabel={t('applications.revertAccessibility', {
                name: stage.name,
              })}
              className="min-h-8 items-center justify-center rounded-full border border-line px-2.5">
              <Text className="text-[11px] font-bold text-muted">{t('applications.revert')}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      {nextStage ? (
        <Pressable
          disabled={busy}
          onPress={() => onRecord(nextStage.id)}
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
          onPress={() => onClose('rejected')}
          className="min-h-9 flex-1 items-center justify-center rounded-xl border border-line">
          <Text className="text-xs font-bold text-muted">{t('applications.closeRejected')}</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => onClose('withdrawn')}
          className="min-h-9 flex-1 items-center justify-center rounded-xl border border-line">
          <Text className="text-xs font-bold text-muted">{t('applications.closeWithdrawn')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
