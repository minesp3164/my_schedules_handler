import { Text, View } from 'react-native';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

type Summary = { points: number; completedDays: number };

type HistorySummaryProps = {
  current: Summary;
  pointChange: number;
  completedDayChange: number;
  comparisonMessage: string;
  dailyPoints: { date: string; points: number }[];
};

export function HistorySummary({
  current,
  pointChange,
  completedDayChange,
  comparisonMessage,
  dailyPoints,
}: HistorySummaryProps) {
  const { palette } = useTheme();
  const maxDailyPoints = Math.max(...dailyPoints.map((day) => day.points), 1);
  return (
    <>
      <View className="mt-6 flex-row gap-3">
        <Metric
          label={t('history.weeklyPoints')}
          value={t('common.point', { count: current.points })}
        />
        <Metric
          label={t('history.completedDays')}
          value={t('common.day', { count: current.completedDays })}
        />
      </View>
      <View
        className="mt-5 overflow-hidden rounded-2xl p-5"
        style={{ backgroundColor: palette.accentDeep }}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-[17px] font-bold text-white">{t('history.comparisonTitle')}</Text>
            <Text className="mt-1 text-sm" style={{ color: palette.accentSoft }}>
              {t('history.comparisonDescription')}
            </Text>
          </View>
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: palette.accent }}>
            <Text className="text-xs font-bold text-white">{t('history.comparisonWindow')}</Text>
          </View>
        </View>
        <Text className="mt-5 text-lg font-bold leading-7 text-white">{comparisonMessage}</Text>
        <View className="mt-5 flex-row">
          <Delta
            label={t('history.pointDelta')}
            value={`${pointChange > 0 ? '+' : ''}${t('common.point', { count: pointChange })}`}
            bordered
          />
          <Delta
            label={t('history.completedDayDelta')}
            value={`${completedDayChange > 0 ? '+' : ''}${t('common.day', { count: completedDayChange })}`}
          />
        </View>
      </View>
      <View className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <Text className="font-bold text-[#26332D]">{t('history.dailyPoints')}</Text>
        <View className="mt-5 flex-row items-end justify-between gap-2">
          {dailyPoints.map((day) => (
            <View key={day.date} className="flex-1 items-center">
              <View
                className="w-full rounded-t-md bg-lavender"
                style={{
                  height: Math.max((day.points / maxDailyPoints) * 140, 4),
                  backgroundColor: palette.accent,
                }}
              />
              <Text className="mt-2 text-xs text-muted">{day.date.slice(8)}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-surface p-4">
      <Text className="text-xs text-muted">{label}</Text>
      <Text className="mt-1 text-2xl font-bold text-[#26332D]">{value}</Text>
    </View>
  );
}
function Delta({ label, value, bordered }: { label: string; value: string; bordered?: boolean }) {
  const { palette } = useTheme();
  return (
    <View
      className={`flex-1 ${bordered ? 'border-r pr-4' : 'pl-4'}`}
      style={bordered ? { borderRightColor: palette.accent } : undefined}>
      <Text className="text-xs" style={{ color: palette.accentSoft }}>
        {label}
      </Text>
      <Text className="mt-1 text-xl font-bold" style={{ color: palette.accentSoft }}>
        {value}
      </Text>
    </View>
  );
}
