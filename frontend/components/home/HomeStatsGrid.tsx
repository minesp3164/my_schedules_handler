import { type ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

function StatTile({
  icon,
  color,
  value,
  label,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center justify-center rounded-3xl border border-hairline bg-white px-3 py-6">
      <Ionicons name={icon} size={26} color={color} />
      <Text className="mt-3 text-[30px] font-bold leading-9 text-ink">{value}</Text>
      <Text className="mt-1 text-center text-[11px] font-bold leading-4 tracking-[1.2px] text-meta">
        {label}
      </Text>
    </View>
  );
}

function formatCompactPoints(points: number) {
  if (points < 1_000) return points.toLocaleString();

  const compact = (points / 1_000).toFixed(points >= 10_000 ? 0 : 1).replace(/\.0$/, '');
  return `${compact}K`;
}

// 지표 2 x 2
export function HomeStatsGrid({
  doneCount,
  remainingGoals,
  points,
  totalPoints,
}: {
  doneCount: number;
  remainingGoals: number;
  points: number;
  totalPoints: number;
}) {
  const { palette } = useTheme();
  return (
    <>
      <View className="mx-5 mt-5 flex-row gap-4">
        <StatTile
          icon="checkmark-circle-outline"
          color="#12B76A"
          value={String(doneCount)}
          label={t('home.stats.completed')}
        />
        <StatTile
          icon="time-outline"
          color="#F79009"
          value={String(remainingGoals)}
          label={t('home.stats.remaining')}
        />
      </View>
      <View className="mx-5 mt-4 flex-row gap-4">
        <StatTile
          icon="star-outline"
          color="#2E90FA"
          value={String(points)}
          label={t('home.stats.todayPoints')}
        />
        <StatTile
          icon="trophy-outline"
          color={palette.accent}
          value={formatCompactPoints(totalPoints)}
          label={t('home.stats.totalPoints')}
        />
      </View>
    </>
  );
}
