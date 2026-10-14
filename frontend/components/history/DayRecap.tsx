import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { HistoryDay, RewardUnlockState } from '@/services/api';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

type Props = {
  day: HistoryDay;
  isToday: boolean;
  recovery?: RewardUnlockState | null;
};

// 날짜별 리캡: 오늘의 진척과 "내일로 보낸 할 일", 회복 모드 입구.
export function DayRecap({ day, isToday, recovery }: Props) {
  const { palette } = useTheme();
  const recap = day.recap;
  const focusMinutes = Math.round(day.summary.focus_seconds / 60);
  const hasRemaining = recap.tasks_done < recap.tasks_total;
  const canRecovery =
    isToday && hasRemaining && Boolean(recovery && (recovery.available || recovery.record));

  return (
    <View
      className="mt-4 overflow-hidden rounded-3xl border p-5"
      style={{ borderColor: palette.line, backgroundColor: palette.surface }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-[10px] font-bold tracking-[1.5px]" style={{ color: palette.accent }}>
          DAY RECAP
        </Text>
        <Text className="text-[11px] text-muted">{day.date}</Text>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        <Stat
          label={t('history.stat.point')}
          value={t('common.point', { count: day.summary.points_total })}
        />
        <Stat
          label={t('history.stat.focus')}
          value={t('history.stat.minutes', { count: focusMinutes })}
        />
        <Stat
          label={t('history.stat.goal')}
          value={`${recap.tasks_done}/${recap.tasks_total}`}
          highlight={recap.goal_achieved}
        />
      </View>

      {recap.goal_achieved ? (
        <Text className="mt-3 text-xs font-bold" style={{ color: palette.accent }}>
          {t('history.goalFilled')}
        </Text>
      ) : isToday && hasRemaining ? (
        <Text className="mt-3 text-xs text-muted">
          {t('history.tasksRemaining', { count: recap.tasks_total - recap.tasks_done })}
        </Text>
      ) : null}

      {recap.deferred.length ? (
        <View className="mt-3 rounded-2xl bg-[#E9F9BC] px-4 py-3">
          <Text className="text-[10px] font-bold text-[#667247]">{t('history.deferredTitle')}</Text>
          {recap.deferred.map((item) => (
            <Text key={item.deferral_id} className="mt-1 text-sm text-[#37451C]">
              · {item.title} →{' '}
              {t('history.deferredDate', {
                month: item.to_date.slice(5, 7),
                day: item.to_date.slice(8, 10),
              })}
            </Text>
          ))}
        </View>
      ) : null}

      {canRecovery ? (
        <Pressable
          onPress={() => router.push({ pathname: '/rewards/[kind]', params: { kind: 'recovery' } })}
          accessibilityRole="button"
          accessibilityLabel={t('history.recoveryButtonLabel')}
          className="mt-4 flex-row items-center justify-between rounded-2xl px-4 py-3.5"
          style={{ backgroundColor: recovery?.record ? '#9AC13C' : palette.accent }}>
          <Text className="text-sm font-bold text-white">{t('history.recoveryButtonTitle')}</Text>
          <Text className="text-base text-white">→</Text>
        </Pressable>
      ) : null}
      {isToday && hasRemaining && recovery && !recovery.unlocked ? (
        <Text className="mt-3 text-[11px] text-muted">{t('history.recoveryLocked')}</Text>
      ) : null}
      {isToday && hasRemaining && recovery && recovery.unlocked && !canRecovery ? (
        <Text className="mt-3 text-[11px] text-muted">
          {recovery.reason === 'limit' ? t('history.recoveryUsed') : t('history.recoveryDeferred')}
        </Text>
      ) : null}
    </View>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { palette } = useTheme();
  return (
    <View
      className="rounded-xl px-3 py-2"
      style={{ backgroundColor: highlight ? palette.accent : palette.accentSoft }}>
      <Text className="text-[10px]" style={{ color: highlight ? '#FFFFFF' : palette.accent }}>
        {label}
      </Text>
      <Text
        className="mt-0.5 text-sm font-bold"
        style={{ color: highlight ? '#FFFFFF' : palette.accentDeep }}>
        {value}
      </Text>
    </View>
  );
}
