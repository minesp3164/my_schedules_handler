import { Pressable, Text, View } from 'react-native';
import { getHistory } from '@/services/api';
import { formatMonth, formatShortDate, locale, t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

type Props = {
  month: Date;
  days: Awaited<ReturnType<typeof getHistory>>;
  selectedDate: string;
  onSelect: (date: string) => void;
  onMove: (amount: number) => void;
};
const iso = (date: Date) => date.toISOString().slice(0, 10);

export function HistoryCalendar({ month, days, selectedDate, onSelect, onMove }: Props) {
  const { palette } = useTheme();
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const points = new Map(days.map((day) => [day.date, day.summary.points_total]));
  const cells: ({ date: Date; key: string; points: number } | null)[] = [
    ...Array.from({ length: start.getDay() }, () => null),
    ...Array.from({ length: end.getDate() }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
      return { date, key: iso(date), points: points.get(iso(date)) ?? 0 };
    }),
  ];
  while (cells.length % 7) cells.push(null);
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'ko-KR', { weekday: 'narrow' }).format(
      new Date(2024, 0, index + 7)
    )
  );
  const selectedPoints = points.get(selectedDate) ?? 0;
  return (
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
          <MonthButton label={t('history.previousMonth')} symbol="‹" onPress={() => onMove(-1)} />
          <MonthButton label={t('history.nextMonth')} symbol="›" onPress={() => onMove(1)} />
        </View>
      </View>
      <Text className="mt-5 text-center text-base font-bold text-[#173052]">
        {formatMonth(month)}
      </Text>
      <View className="mt-4 flex-row">
        {weekdays.map((day) => (
          <Text key={day} className="flex-1 text-center text-[11px] font-semibold text-muted">
            {day}
          </Text>
        ))}
      </View>
      <View className="mt-2">
        {Array.from({ length: cells.length / 7 }, (_, week) => (
          <View key={week} className="flex-row">
            {cells
              .slice(week * 7, week * 7 + 7)
              .map((day, index) =>
                !day ? (
                  <View key={index} className="flex-1" />
                ) : (
                  <DayCell
                    key={day.key}
                    day={day}
                    selected={selectedDate === day.key}
                    onSelect={onSelect}
                  />
                )
              )}
          </View>
        ))}
      </View>
      <View className="mt-4 rounded-xl px-3 py-3" style={{ backgroundColor: palette.accentSoft }}>
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
  );
}
function MonthButton({
  label,
  symbol,
  onPress,
}: {
  label: string;
  symbol: string;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      className="h-9 w-9 items-center justify-center rounded-lg"
      style={{ backgroundColor: palette.accentSoft }}>
      <Text className="text-lg font-bold" style={{ color: palette.accent }}>
        {symbol}
      </Text>
    </Pressable>
  );
}
function DayCell({
  day,
  selected,
  onSelect,
}: {
  day: { date: Date; key: string; points: number };
  selected: boolean;
  onSelect: (date: string) => void;
}) {
  const { palette } = useTheme();
  const hasPoints = day.points > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t('history.selectedDayPoints', {
        date: formatShortDate(day.date),
        points: t('common.point', { count: day.points }),
      })}
      onPress={() => onSelect(day.key)}
      className="flex-1 p-0.5">
      <View
        className="min-h-12 items-center justify-center rounded-lg"
        style={{
          backgroundColor: selected
            ? palette.accent
            : hasPoints
              ? palette.accentSoft
              : 'transparent',
        }}>
        <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-[#173052]'}`}>
          {day.date.getDate()}
        </Text>
        {hasPoints ? (
          <Text
            className={`mt-0.5 text-[9px] font-semibold ${selected ? 'text-white' : 'text-muted'}`}>
            +{day.points}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
