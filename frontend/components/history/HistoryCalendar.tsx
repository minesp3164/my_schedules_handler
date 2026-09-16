import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getHistory, type HistoryDay } from '@/services/api';
import { formatMonth, formatShortDate, locale, t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

const EVENTS_PAGE_SIZE = 5;

type Props = {
  month: Date;
  days: Awaited<ReturnType<typeof getHistory>>;
  selectedDate: string;
  onSelect: (date: string) => void;
  onMove: (amount: number) => void;
};
const iso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const localDateFromIso = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
};

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
  const selectedDay = days.find((day) => day.date === selectedDate);
  const events = (selectedDay?.point_events ?? []).filter((event) => event.points !== 0);
  const [visibleCount, setVisibleCount] = useState(EVENTS_PAGE_SIZE);
  useEffect(() => setVisibleCount(EVENTS_PAGE_SIZE), [selectedDate]);
  const visibleEvents = events.slice(0, visibleCount);
  const hiddenCount = events.length - visibleEvents.length;
  return (
    <View
      className="mt-5 rounded-2xl p-4"
      style={{ backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1 }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-bold text-[#26332D]">{t('history.calendarTitle')}</Text>
          <Text className="mt-1 text-xs leading-5 text-muted">
            {t('history.calendarDescription')}
          </Text>
        </View>
        <View className="flex-row gap-1">
          <MonthButton label={t('history.previousMonth')} symbol="‹" onPress={() => onMove(-1)} />
          <MonthButton label={t('history.nextMonth')} symbol="›" onPress={() => onMove(1)} />
        </View>
      </View>
      <Text className="mt-5 text-center text-base font-bold text-[#26332D]">
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
        <Text className="text-center text-sm font-semibold text-[#26332D]">
          {selectedPoints > 0
            ? t('history.selectedDayPoints', {
                date: formatShortDate(localDateFromIso(selectedDate)),
                points: t('common.point', { count: selectedPoints }),
              })
            : t('history.noPoints')}
        </Text>
        {events.length ? (
          <View className="mt-3 gap-2">
            {visibleEvents.map((event) => (
              <PointEventRow key={event.id} event={event} />
            ))}
            {hiddenCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setVisibleCount((count) => count + EVENTS_PAGE_SIZE)}
                className="items-center rounded-lg px-3 py-2.5"
                style={{ backgroundColor: palette.accentSoft }}>
                <Text className="text-xs font-bold" style={{ color: palette.accent }}>
                  {t('history.showMore', { count: hiddenCount })}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PointEventRow({ event }: { event: HistoryDay['point_events'][number] }) {
  const { palette } = useTheme();
  const label = event.source_title || t(`history.event.${event.event_type}`);
  const positive = event.points > 0;
  return (
    <View className="flex-row items-center justify-between rounded-lg bg-white px-3 py-2.5">
      <Text className="flex-1 pr-3 text-xs font-semibold text-[#26332D]">{label}</Text>
      <Text className="text-sm font-bold" style={{ color: positive ? palette.accent : '#D65050' }}>
        {positive ? '+' : ''}
        {event.points}점
      </Text>
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
      className="h-9 w-9 items-center justify-center rounded-lg transition duration-150 hover:-translate-y-px hover:opacity-90"
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
        <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-[#26332D]'}`}>
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
