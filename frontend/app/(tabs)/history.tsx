import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { getHistory } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { formatMonth, formatShortDate, locale, t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

const iso = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const summaryFor = (days: Awaited<ReturnType<typeof getHistory>>) => ({
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
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 13);
  const history = useQuery({
    queryKey: ['history'],
    queryFn: () => getHistory(token!, iso(start), iso(end)),
    enabled: Boolean(token),
  });
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const calendar = useQuery({
    queryKey: ['history-calendar', iso(monthStart), iso(monthEnd)],
    queryFn: () => getHistory(token!, iso(monthStart), iso(monthEnd)),
    enabled: Boolean(token),
  });
  const days = history.data ?? [];
  const currentWeek = days.slice(-7);
  const previousWeek = days.slice(0, -7);
  const currentSummary = summaryFor(currentWeek);
  const previousSummary = summaryFor(previousWeek);
  const pointChange = currentSummary.points - previousSummary.points;
  const completedDayChange = currentSummary.completedDays - previousSummary.completedDays;
  const maxDailyPoints = Math.max(...currentWeek.map((day) => day.summary.points_total), 1);
  const pointComparisonMessage =
    previousWeek.length === 0
      ? t('history.noPreviousData')
      : pointChange > 0
        ? t('history.morePoints', { points: pointChange })
        : pointChange < 0
          ? t('history.lessPoints', { points: Math.abs(pointChange) })
          : t('history.samePoints');
  const calendarDays = calendar.data ?? [];
  const pointsByDate = new Map(calendarDays.map((day) => [day.date, day.summary.points_total]));
  const leadingEmptyDays = Array.from({ length: monthStart.getDay() });
  const monthDates = Array.from({ length: monthEnd.getDate() }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
    return { date, key: iso(date), points: pointsByDate.get(iso(date)) ?? 0 };
  });
  const selectedPoints = pointsByDate.get(selectedDate) ?? 0;
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'ko-KR', { weekday: 'narrow' }).format(
      new Date(2024, 0, index + 7)
    )
  );
  const moveMonth = (amount: number) => {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(nextMonth);
    setSelectedDate(iso(nextMonth));
  };
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="px-5 pb-8 pt-8">
        <Text className="text-2xl font-bold text-[#173052]">{t('history.title')}</Text>
        <Text className="mt-2 text-sm text-muted">{t('history.description')}</Text>
        <View className="mt-6 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-surface p-4">
            <Text className="text-xs text-muted">{t('history.weeklyPoints')}</Text>
            <Text className="mt-1 text-2xl font-bold text-[#173052]">
              {t('common.point', { count: currentSummary.points })}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl bg-surface p-4">
            <Text className="text-xs text-muted">{t('history.completedDays')}</Text>
            <Text className="mt-1 text-2xl font-bold text-[#173052]">
              {t('common.day', {
                count: currentSummary.completedDays,
              })}
            </Text>
          </View>
        </View>
        <View className="mt-5 overflow-hidden rounded-2xl bg-[#173052] p-5">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[17px] font-bold text-white">
                {t('history.comparisonTitle')}
              </Text>
              <Text className="mt-1 text-sm text-[#B9CCE3]">
                {t('history.comparisonDescription')}
              </Text>
            </View>
            <View className="rounded-full bg-[#2B4A70] px-2.5 py-1">
              <Text className="text-xs font-bold text-[#79CEFF]">
                {t('history.comparisonWindow')}
              </Text>
            </View>
          </View>
          <Text className="mt-5 text-lg font-bold leading-7 text-white">
            {pointComparisonMessage}
          </Text>
          <View className="mt-5 flex-row">
            <View className="flex-1 border-r border-[#385778] pr-4">
              <Text className="text-xs text-[#B9CCE3]">{t('history.pointDelta')}</Text>
              <Text className="mt-1 text-xl font-bold text-[#79CEFF]">
                {pointChange > 0 ? '+' : ''}
                {t('common.point', { count: pointChange })}
              </Text>
            </View>
            <View className="flex-1 pl-4">
              <Text className="text-xs text-[#B9CCE3]">{t('history.completedDayDelta')}</Text>
              <Text className="mt-1 text-xl font-bold text-[#79CEFF]">
                {completedDayChange > 0 ? '+' : ''}
                {t('common.day', { count: completedDayChange })}
              </Text>
            </View>
          </View>
        </View>
        <View className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <Text className="font-bold text-[#173052]">{t('history.dailyPoints')}</Text>
          <View className="mt-5 flex-row items-end justify-between gap-2">
            {currentWeek.map((day) => (
              <View key={day.date} className="flex-1 items-center">
                <View
                  className="w-full rounded-t-md bg-lavender"
                  style={{
                    height: Math.max((day.summary.points_total / maxDailyPoints) * 140, 4),
                    backgroundColor: palette.accent,
                  }}
                />
                <Text className="mt-2 text-xs text-muted">{day.date.slice(8)}</Text>
              </View>
            ))}
          </View>
        </View>
        <View
          className="mt-5 rounded-2xl p-4"
          style={{ backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="font-bold text-[#173052]">{t('history.calendarTitle')}</Text>
              <Text className="mt-1 text-xs leading-5 text-muted">
                {t('history.calendarDescription')}
              </Text>
            </View>
            <View className="flex-row gap-1">
              <Pressable
                accessibilityLabel={t('history.previousMonth')}
                onPress={() => moveMonth(-1)}
                className="h-9 w-9 items-center justify-center rounded-lg bg-[#EAF4FF]">
                <Text className="text-lg font-bold text-[#173052]">‹</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={t('history.nextMonth')}
                onPress={() => moveMonth(1)}
                className="h-9 w-9 items-center justify-center rounded-lg bg-[#EAF4FF]">
                <Text className="text-lg font-bold text-[#173052]">›</Text>
              </Pressable>
            </View>
          </View>
          <Text className="mt-5 text-center text-base font-bold text-[#173052]">
            {formatMonth(month)}
          </Text>
          <View className="mt-4 flex-row">
            {weekdays.map((weekday) => (
              <Text
                key={weekday}
                className="flex-1 text-center text-[11px] font-semibold text-muted">
                {weekday}
              </Text>
            ))}
          </View>
          <View className="mt-2 flex-row flex-wrap">
            {leadingEmptyDays.map((_, index) => (
              <View key={`empty-${index}`} className="w-[14.2857%] p-0.5" />
            ))}
            {monthDates.map(({ date, key, points }) => {
              const selected = selectedDate === key;
              const hasPoints = points > 0;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t('history.selectedDayPoints', {
                    date: formatShortDate(date),
                    points: t('common.point', { count: points }),
                  })}
                  onPress={() => setSelectedDate(key)}
                  className="w-[14.2857%] p-0.5">
                  <View
                    className="min-h-12 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: selected
                        ? palette.accent
                        : hasPoints
                          ? palette.accentSoft
                          : 'transparent',
                    }}>
                    <Text
                      className={`text-xs font-bold ${selected ? 'text-white' : 'text-[#173052]'}`}>
                      {date.getDate()}
                    </Text>
                    {hasPoints ? (
                      <Text
                        className={`mt-0.5 text-[9px] font-semibold ${selected ? 'text-white' : 'text-muted'}`}>
                        +{points}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View
            className="mt-4 rounded-xl px-3 py-3"
            style={{ backgroundColor: palette.accentSoft }}>
            <Text className="text-center text-sm font-semibold text-[#173052]">
              {selectedPoints > 0
                ? t('history.selectedDayPoints', {
                    date: formatShortDate(new Date(`${selectedDate}T00:00:00`)),
                    points: t('common.point', { count: selectedPoints }),
                  })
                : t('history.noPoints')}
            </Text>
          </View>
        </View>
        {history.isError ? (
          <Text className="mt-4 text-sm text-[#FF9BA6]">{history.error.message}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
