import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  getDashboard,
  getHistory,
  getWeeklyRetro,
  saveWeeklyRetro,
  type HistoryDay,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

const DAY_MS = 86_400_000;

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const mondayOf = (date: Date) => {
  const day = (date.getDay() + 6) % 7; // 일요일=0 → 월요일 기준으로 보정
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day);
};

const formatWeekRange = (start: Date) => {
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return `${start.getMonth() + 1}.${start.getDate()} – ${end.getMonth() + 1}.${end.getDate()}`;
};

const formatFocusSeconds = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t('retro.focusMinutes', { minutes });
  return t('retro.focusHours', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
};

type WeekStats = {
  points: number;
  focusSeconds: number;
  focusSessions: number;
  completedTasks: number;
  goalDays: number;
  dailyPoints: number[];
  taskCounts: { title: string; count: number }[];
};

const emptyStats: WeekStats = {
  points: 0,
  focusSeconds: 0,
  focusSessions: 0,
  completedTasks: 0,
  goalDays: 0,
  dailyPoints: Array(7).fill(0),
  taskCounts: [],
};

function aggregate(days: HistoryDay[] | undefined): WeekStats {
  if (!days?.length) return emptyStats;
  const stats: WeekStats = { ...emptyStats, dailyPoints: Array(7).fill(0) };
  const perTask = new Map<string, number>();

  days.forEach((day) => {
    stats.points += day.summary.points_total;
    stats.focusSeconds += day.summary.focus_seconds ?? 0;
    if (day.summary.all_goals_completed_at) stats.goalDays += 1;
    const weekday = (new Date(`${day.date}T00:00:00`).getDay() + 6) % 7;
    stats.dailyPoints[weekday] = day.summary.points_total;

    for (const event of day.point_events) {
      if (event.reversed_at) continue;
      if (event.event_type === 'focus_completion') stats.focusSessions += 1;
      // 집중 완료가 자동 체크하는 'focus' 할 일은 '집중 세션' 행과 같은 기록이라 제외한다.
      if (event.event_type === 'task_completion' && event.source_kind !== 'focus') {
        stats.completedTasks += 1;
        const title = event.source_title ?? '-';
        perTask.set(title, (perTask.get(title) ?? 0) + 1);
      }
    }
  });
  stats.taskCounts = [...perTask.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);
  return stats;
}

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

export default function WeeklyRetroScreen() {
  const [token, setToken] = useState<string | null>();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [draft, setDraft] = useState('');
  const [savedTick, setSavedTick] = useState(false);
  const { palette } = useTheme();
  const queryClient = useQueryClient();

  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);

  // 웹 Safari는 KeyboardAvoidingView와 interactive-widget이 안 먹혀서 visualViewport로 보정한다.
  const footerRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const viewport = (globalThis as { visualViewport?: VisualViewport }).visualViewport;
    if (!viewport) return;
    const update = () => {
      const node = footerRef.current as unknown as { style?: CSSStyleDeclaration } | null;
      if (!node?.style) return;
      const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      node.style.transform = covered > 0 ? `translateY(${-covered}px)` : '';
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  const thisMonday = useMemo(() => mondayOf(new Date()), []);
  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 6 * DAY_MS), [weekStart]);
  const prevStart = useMemo(() => new Date(weekStart.getTime() - 7 * DAY_MS), [weekStart]);
  const prevEnd = useMemo(() => new Date(weekStart.getTime() - 1 * DAY_MS), [weekStart]);
  const isCurrentWeek = weekStart.getTime() >= thisMonday.getTime();
  const weekKey = iso(weekStart);

  const week = useQuery({
    queryKey: ['retro-week', weekKey],
    queryFn: () => getHistory(token!, weekKey, iso(weekEnd)),
    enabled: Boolean(token),
  });
  const previous = useQuery({
    queryKey: ['retro-week', iso(prevStart)],
    queryFn: () => getHistory(token!, iso(prevStart), iso(prevEnd)),
    enabled: Boolean(token),
  });
  const retro = useQuery({
    queryKey: ['weekly-retro', weekKey],
    queryFn: () => getWeeklyRetro(token!, weekKey),
    enabled: Boolean(token),
  });
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard(token!),
    enabled: Boolean(token),
  });

  const stats = useMemo(() => aggregate(week.data), [week.data]);
  const prevStats = useMemo(() => aggregate(previous.data), [previous.data]);
  const weeklyGoal = dashboard.data?.rewards.weekly.required_points;
  const goalPercent = weeklyGoal ? Math.min(Math.round((stats.points / weeklyGoal) * 100), 100) : 0;
  const maxDaily = Math.max(...stats.dailyPoints, 1);

  useEffect(() => {
    setDraft(retro.data?.body ?? '');
  }, [retro.data?.body, weekKey]);

  const save = useMutation({
    mutationFn: () => saveWeeklyRetro(token!, weekKey, draft.trim()),
    onSuccess: (result) => {
      queryClient.setQueryData(['weekly-retro', weekKey], result.data);
      // 생성 시 포인트가 차감되고 원장에 보상 사용 이벤트가 남으므로 관련 캐시를 무효화한다.
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['retro-week'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['history-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['point-history'] });
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 2_000);
    },
  });

  const moveWeek = (weeks: number) => {
    setWeekStart((current) => new Date(current.getTime() + weeks * 7 * DAY_MS));
    setSavedTick(false);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="mt-3 flex-row items-center justify-between px-5">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel={t('common.goHome')}
            className="h-10 w-10 items-center justify-center rounded-xl bg-white">
            <Text className="text-xl text-muted">‹</Text>
          </Pressable>
          <Text className="text-base font-bold" style={{ color: palette.accentDeep }}>
            {isCurrentWeek ? t('retro.title') : t('retro.pastTitle', { week: formatWeekRange(weekStart) })}
          </Text>
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() => moveWeek(-1)}
              accessibilityLabel={t('retro.prevWeek')}
              className="h-10 w-8 items-center justify-center">
              <Text className="text-lg text-muted">‹</Text>
            </Pressable>
            <Pressable
              onPress={() => moveWeek(1)}
              disabled={isCurrentWeek}
              accessibilityLabel={t('retro.nextWeek')}
              className="h-10 w-8 items-center justify-center"
              style={{ opacity: isCurrentWeek ? 0.25 : 1 }}>
              <Text className="text-lg text-muted">›</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6 pt-4">
          <View
            className="rounded-3xl p-6"
            style={{ backgroundColor: palette.accent }}>
            <Text className="text-xs font-semibold text-white/80">
              {isCurrentWeek ? t('retro.weeklyPoints') : t('retro.weeklyPointsPast')} · {formatWeekRange(weekStart)}
            </Text>
            <Text className="mt-1 text-5xl font-extrabold tracking-tight text-white">
              {stats.points}
              <Text className="text-lg font-semibold text-white/80">점</Text>
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
              <Text className="mt-0.5 text-[11px] font-semibold text-muted">{t('retro.totalFocus')}</Text>
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
                    className="w-[22px] rounded-t-lg rounded-b"
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
                    max={Math.max(stats.focusSessions, stats.taskCounts[0]?.count ?? 0)}
                    color={palette.accent}
                    bordered={false}
                  />
                ) : null}
                {stats.taskCounts.map((task, index) => (
                  <TaskRow
                    key={task.title}
                    title={task.title}
                    count={task.count}
                    max={Math.max(stats.focusSessions, stats.taskCounts[0]?.count ?? 0)}
                    color={palette.accent}
                    bordered={index > 0 || stats.focusSessions > 0}
                  />
                ))}
              </>
            ) : (
              <Text className="py-3 text-center text-xs text-muted">{t('retro.noTasks')}</Text>
            )}
          </View>

          {week.isError ? (
            <Text className="mt-4 text-center text-sm text-[#FF9BA6]">{week.error.message}</Text>
          ) : null}
        </ScrollView>

        <View
          ref={footerRef}
          className="border-t border-line px-5 pb-4 pt-3"
          style={{ backgroundColor: palette.screen }}>
          <Text className="mb-2 text-[13px] font-extrabold text-[#26332D]">
            {isCurrentWeek ? t('retro.retroPrompt') : t('retro.retroPromptPast')}
          </Text>
          <View className="flex-row gap-2">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('retro.placeholder')}
              placeholderTextColor="#8AA08F"
              maxLength={500}
              className="flex-1 rounded-2xl border border-line bg-white px-4 py-3 text-[13px] text-[#26332D]"
            />
            <Pressable
              onPress={() => save.mutate()}
              disabled={save.isPending || !token}
              className="items-center justify-center rounded-2xl bg-[#26332D] px-5 disabled:opacity-50">
              <Text className="text-[13px] font-extrabold text-white">
                {savedTick ? t('retro.saved') : t('retro.save')}
              </Text>
            </Pressable>
          </View>
          {retro.data?.body ? (
            <Text className="mt-1.5 text-[10px] text-muted">{t('retro.emptyBodyDeleteHint')}</Text>
          ) : (
            <Text className="mt-1.5 text-[10px] text-muted">{t('retro.costHint')}</Text>
          )}
          {save.isError ? (
            <Text className="mt-1.5 text-[11px] text-[#FF9BA6]">{save.error.message}</Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
          style={{ width: `${Math.max((count / Math.max(max, 1)) * 100, 8)}%`, backgroundColor: color }}
        />
      </View>
      <Text className="text-xs font-extrabold" style={{ color }}>
        {t('common.times', { count })}
      </Text>
    </View>
  );
}
