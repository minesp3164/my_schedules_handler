import { Text, View } from 'react-native';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import { formatFocusSeconds, formatWeekRange, type WeekStats } from '@/services/week-stats';

function Delta({ value, unit }: { value: number; unit?: string }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <Text className={`text-[10px] font-bold ${positive ? 'text-[#3E8E68]' : 'text-[#E2786B]'}`}>
      {positive ? '+' : ''}
      {value}
      {unit}
    </Text>
  );
}

function TaskRow({
  title,
  count,
  max,
  color,
  bordered,
}: {
  title: string;
  count: number;
  max: number;
  color: string;
  bordered: boolean;
}) {
  return (
    <View
      className="flex-row items-center gap-2.5 py-2.5"
      style={bordered ? { borderTopWidth: 1, borderTopColor: '#F0F4F1' } : undefined}>
      <Text className="flex-1 text-[13px] font-semibold text-[#26332D]">{title}</Text>
      <View className="h-1.5 w-16 overflow-hidden rounded-full bg-[#EDF3F0]">
        <View
          className="h-full rounded-full"
          style={{
            width: `${Math.max((count / Math.max(max, 1)) * 100, 8)}%`,
            backgroundColor: color,
          }}
        />
      </View>
      <Text className="text-xs font-extrabold" style={{ color }}>
        {t('common.times', { count })}
      </Text>
    </View>
  );
}

// 주간 요약: 포인트 히어로 · 지표 3종 · 일별 포인트 차트 · 할 일별 집계.
export function RetroSummary({
  stats,
  prevStats,
  weeklyGoal,
  isCurrentWeek,
  weekStart,
}: {
  stats: WeekStats;
  prevStats: WeekStats;
  weeklyGoal: number | undefined;
  isCurrentWeek: boolean;
  weekStart: Date;
}) {
  const { palette } = useTheme();
  const goalPercent = weeklyGoal ? Math.min(Math.round((stats.points / weeklyGoal) * 100), 100) : 0;
  const maxDaily = Math.max(...stats.dailyPoints, 1);
  const topCount = Math.max(stats.focusSessions, stats.taskCounts[0]?.count ?? 0);
  return (
    <>
      <View className="rounded-3xl p-6" style={{ backgroundColor: palette.accent }}>
        <Text className="text-xs font-semibold text-white/80">
          {isCurrentWeek ? t('retro.weeklyPoints') : t('retro.weeklyPointsPast')} ·{' '}
          {formatWeekRange(weekStart)}
        </Text>
        <Text className="mt-1 text-5xl font-extrabold tracking-tight text-white">
          {stats.points}
          <Text className="text-lg font-semibold text-white/80">{t('retro.pointUnit')}</Text>
        </Text>
        {weeklyGoal ? (
          <>
            <Text className="mt-1 text-xs text-white/85">
              {t('retro.goalProgress', { goal: weeklyGoal, percent: goalPercent })}
            </Text>
            <View className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
              <View className="h-full rounded-full bg-white" style={{ width: `${goalPercent}%` }} />
            </View>
          </>
        ) : null}
      </View>

      <View className="mt-4 flex-row gap-2.5">
        <View className="flex-1 items-center rounded-2xl bg-white px-2 py-3.5">
          <Text className="text-lg font-extrabold text-[#26332D]">
            {formatFocusSeconds(stats.focusSeconds)}
          </Text>
          <Text className="mt-0.5 text-[11px] font-semibold text-muted">
            {t('retro.totalFocus')}
          </Text>
          <Delta value={stats.focusSeconds - prevStats.focusSeconds} />
        </View>
        <View className="flex-1 items-center rounded-2xl bg-white px-2 py-3.5">
          <Text className="text-lg font-extrabold text-[#26332D]">{stats.completedTasks}</Text>
          <Text className="mt-0.5 text-[11px] font-semibold text-muted">
            {t('retro.completedTasks')}
          </Text>
          <Delta value={stats.completedTasks - prevStats.completedTasks} />
        </View>
        <View className="flex-1 items-center rounded-2xl bg-white px-2 py-3.5">
          <Text className="text-lg font-extrabold text-[#26332D]">
            {t('common.day', { count: stats.goalDays })}
          </Text>
          <Text className="mt-0.5 text-[11px] font-semibold text-muted">{t('retro.goalDays')}</Text>
          <Delta value={stats.goalDays - prevStats.goalDays} />
        </View>
      </View>

      <View className="mt-4 rounded-2xl bg-white p-4">
        <Text className="mb-3 text-[13px] font-extrabold text-[#26332D]">
          {t('retro.dailyPoints')}
        </Text>
        <View className="h-28 flex-row items-end justify-between px-1">
          {stats.dailyPoints.map((points, index) => (
            <View key={index} className="flex-1 items-center gap-1.5">
              <View
                className="w-[22px] rounded-b rounded-t-lg"
                style={{
                  height: Math.max((points / maxDaily) * 88, 4),
                  backgroundColor: points > 0 ? palette.accent : '#DCE9E2',
                }}
              />
              <Text className="text-[10px] font-semibold text-muted">
                {t(`tasks.weekdayShort${(index + 1) % 7}`)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mt-4 rounded-2xl bg-white p-4">
        <Text className="mb-1 text-[13px] font-extrabold text-[#26332D]">{t('retro.perTask')}</Text>
        {stats.focusSessions > 0 || stats.taskCounts.length > 0 ? (
          <>
            {stats.focusSessions > 0 ? (
              <TaskRow
                title={t('retro.focusSessions')}
                count={stats.focusSessions}
                max={topCount}
                color={palette.accent}
                bordered={false}
              />
            ) : null}
            {stats.taskCounts.map((task, index) => (
              <TaskRow
                key={task.title}
                title={task.title}
                count={task.count}
                max={topCount}
                color={palette.accent}
                bordered={index > 0 || stats.focusSessions > 0}
              />
            ))}
          </>
        ) : (
          <Text className="py-3 text-center text-xs text-muted">{t('retro.noTasks')}</Text>
        )}
      </View>
    </>
  );
}
