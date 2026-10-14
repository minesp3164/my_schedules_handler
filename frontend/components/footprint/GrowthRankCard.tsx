import { Text, View } from 'react-native';
import { t } from '@/services/i18n';
import { overallRank } from '@/services/milestones';
import { useTheme } from '@/services/theme';

// 종합 성장 등급 카드: 평균 등급과 단계 범위를 보여준다.
export function GrowthRankCard({ overall }: { overall: ReturnType<typeof overallRank> | null }) {
  const { palette } = useTheme();
  return (
    <View
      className="mt-3.5 overflow-hidden rounded-[26px] p-5"
      style={{ backgroundColor: palette.accentSoft }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text
            className="text-[10px] font-bold tracking-[1.4px]"
            style={{ color: palette.accentDeep }}>
            CURRENT RANK
          </Text>
          <Text
            className="mt-1.5 text-[24px] font-bold leading-8 tracking-tight"
            style={{ color: palette.accentDeep }}>
            {overall?.name ?? t('footprint.screen.rankCalculating')}
          </Text>
          <Text className="mt-1.5 text-[11.5px] leading-5" style={{ color: palette.accentDeep }}>
            {t('footprint.screen.rankDescription', {
              from: t('footprint.tiers.bronze'),
              to: t('footprint.tiers.diamond'),
            })}
          </Text>
        </View>
        <View
          className="h-[76px] w-[76px] items-center justify-center rounded-full border-[8px] bg-white"
          style={{
            borderColor: palette.line,
            borderTopColor: palette.accent,
            borderRightColor: palette.accent,
          }}>
          <Text className="text-xl font-bold" style={{ color: palette.accentDeep }}>
            {overall?.shortName ?? '…'}
          </Text>
          <Text className="text-[9px]" style={{ color: palette.accentDeep }}>
            {t('footprint.screen.growthRankLabel')}
          </Text>
        </View>
      </View>
    </View>
  );
}
