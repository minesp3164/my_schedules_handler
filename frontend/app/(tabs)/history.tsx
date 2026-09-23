import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { getHistory, getRewardUnlocks } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import { DayRecap } from '@/components/history/DayRecap';
import { HistoryCalendar } from '@/components/history/HistoryCalendar';
import { HistorySummary } from '@/components/history/HistorySummary';

const iso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
const mondayOf = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));
const summarize = (days: Awaited<ReturnType<typeof getHistory>>) => ({
  points: days.reduce((sum, day) => sum + day.summary.points_total, 0),
  completedDays: days.filter((day) => day.summary.all_goals_completed_at).length,
});

export default function History() {
  const [token, setToken] = useState<string | null>();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(() => iso(new Date()));
  const { palette } = useTheme();
  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);
  const range = useMemo(() => {
    const thisMonday = mondayOf(new Date());
    return { start: addDays(thisMonday, -7), end: addDays(thisMonday, 6), thisMonday };
  }, []);
  const history = useQuery({
    queryKey: ['history'],
    queryFn: () => getHistory(token!, iso(range.start), iso(range.end)),
    enabled: Boolean(token),
  });
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const calendar = useQuery({
    queryKey: ['history-calendar', iso(monthStart), iso(monthEnd)],
    queryFn: () => getHistory(token!, iso(monthStart), iso(monthEnd)),
    enabled: Boolean(token),
  });
  const unlocks = useQuery({
    queryKey: ['reward-unlocks'],
    queryFn: () => getRewardUnlocks(token!),
    enabled: Boolean(token),
  });
  const days = history.data ?? [];
  const currentWeek = days.filter((day) => day.date >= iso(range.thisMonday));
  const previousWeek = days.filter((day) => day.date < iso(range.thisMonday));
  const weeklyDailyPoints = Array.from({ length: 7 }, (_, index) => {
    const date = iso(addDays(range.thisMonday, index));
    const day = currentWeek.find((item) => item.date === date);
    return { date, points: day?.summary.points_total ?? 0 };
  });
  const current = summarize(currentWeek);
  const previous = summarize(previousWeek);
  const pointChange = current.points - previous.points;
  const comparisonMessage =
    previousWeek.length === 0
      ? t('history.noPreviousData')
      : pointChange > 0
        ? t('history.morePoints', { points: pointChange })
        : pointChange < 0
          ? t('history.lessPoints', { points: Math.abs(pointChange) })
          : t('history.samePoints');
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="px-5 pb-8 pt-8">
        <Text className="text-2xl font-bold text-[#26332D]">{t('history.title')}</Text>
        <Text className="mt-2 text-sm text-muted">{t('history.description')}</Text>
        <Pressable
          onPress={() => router.push('/milestones')}
          className="mt-5 overflow-hidden rounded-3xl p-5"
          style={{ backgroundColor: palette.accentSoft }}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text
                className="text-[10px] font-bold tracking-[1.2px]"
                style={{ color: palette.accent }}>
                MILESTONE
              </Text>
              <Text className="mt-1 text-lg font-bold" style={{ color: palette.accentDeep }}>
                쌓인 노력을 돌아보기
              </Text>
              <Text className="mt-1 text-xs" style={{ color: palette.accentDeep }}>
                성장 등급과 랭크 확인하기
              </Text>
            </View>
            <Text className="text-2xl" style={{ color: palette.accent }}>
              ✦
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => router.push('/weekly-retro')}
          className="mt-3 overflow-hidden rounded-3xl p-5"
          style={{ backgroundColor: palette.accentSoft }}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text
                className="text-[10px] font-bold tracking-[1.2px]"
                style={{ color: palette.accent }}>
                WEEKLY RETRO
              </Text>
              <Text className="mt-1 text-lg font-bold" style={{ color: palette.accentDeep }}>
                {t('retro.entryTitle')}
              </Text>
              <Text className="mt-1 text-xs" style={{ color: palette.accentDeep }}>
                {t('retro.entryDescription')}
              </Text>
            </View>
            <Text className="text-2xl" style={{ color: palette.accent }}>
              ✎
            </Text>
          </View>
        </Pressable>
        <HistorySummary
          current={current}
          pointChange={pointChange}
          completedDayChange={current.completedDays - previous.completedDays}
          comparisonMessage={comparisonMessage}
          dailyPoints={weeklyDailyPoints}
        />
        <HistoryCalendar
          month={month}
          days={calendar.data ?? []}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onMove={(amount) => {
            const next = new Date(month.getFullYear(), month.getMonth() + amount, 1);
            setMonth(next);
            setSelectedDate(iso(next));
          }}
        />
        {(() => {
          const selectedDay = (calendar.data ?? days).find((day) => day.date === selectedDate);
          if (!selectedDay) return null;
          return (
            <DayRecap
              day={selectedDay}
              isToday={selectedDate === iso(new Date())}
              recovery={unlocks.data?.unlocks.find((state) => state.kind === 'recovery') ?? null}
            />
          );
        })()}
        {history.isError ? (
          <Text className="mt-4 text-sm text-[#FF9BA6]">{history.error.message}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
