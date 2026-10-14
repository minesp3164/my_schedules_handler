import { Text, View } from 'react-native';
import type { MilestoneProgress } from '@/services/api';
import { t } from '@/services/i18n';
import {
  currentRank,
  formatTrackValue,
  nextRank,
  trackValue,
  type RankTrack,
} from '@/services/milestones';
import { useTheme } from '@/services/theme';

// 분야별 랭크 트랙 한 장: 현재 값 · 등급 · 다음 등급까지 남은 양과 진행 막대.
export function RankTrackCard({
  track,
  progress,
}: {
  track: RankTrack;
  progress: MilestoneProgress | null;
}) {
  const { palette } = useTheme();
  const value = progress ? trackValue(track, progress) : 0;
  const rank = progress ? currentRank(track, progress) : null;
  const next = progress ? nextRank(track, progress) : null;
  const percent = next ? Math.min((value / next.threshold) * 100, 100) : 100;

  return (
    <View className="mt-3 rounded-[20px] border bg-white p-4" style={{ borderColor: '#E4EAE3' }}>
      <View className="flex-row items-center">
        <View
          className="h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: palette.accentSoft }}>
          <Text className="text-xl" style={{ color: palette.accentDeep }}>
            {track.icon}
          </Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[13px] font-bold text-[#303B34]">{track.title}</Text>
          <Text className="mt-1 text-[10px] text-[#778078]">{formatTrackValue(track, value)}</Text>
        </View>
        <View className="items-end">
          <Text className="text-xs font-bold" style={{ color: palette.accent }}>
            {rank?.name ?? t('footprint.tiers.bronze')}
          </Text>
          <Text className="mt-1 text-[10px] text-[#778078]">
            {next
              ? t('footprint.screen.untilTier', {
                  tier: next.tier.name,
                  value: formatTrackValue(track, Math.max(next.threshold - value, 0)),
                })
              : t('footprint.screen.tierMax')}
          </Text>
        </View>
      </View>
      <View
        className="mt-3 h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: '#E4EAE3' }}>
        <View
          className="h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: palette.accent }}
        />
      </View>
    </View>
  );
}
