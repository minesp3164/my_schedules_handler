import { Text, View } from 'react-native';
import type { RewardRedemption } from '@/services/api';
import { t } from '@/services/i18n';
import type { UnlockReward } from '@/services/reward-unlocks';
import { useTheme } from '@/services/theme';
import { RedemptionRow } from './RedemptionRow';
import { RewardCard } from './RewardCard';

// 해금 탭 본문: 포인트 히어로 · 보상 목록 · 사용 기록.
export function UnlocksSection({
  rewards,
  unlockedCount,
  usedRewards,
}: {
  rewards: UnlockReward[];
  unlockedCount: number;
  usedRewards: RewardRedemption[];
}) {
  const { palette } = useTheme();
  return (
    <>
      <View className="mt-4 rounded-3xl px-5 py-5" style={{ backgroundColor: palette.accentSoft }}>
        <Text className="text-[10px] font-bold tracking-[1px]" style={{ color: palette.accent }}>
          UNLOCK WITH POINTS
        </Text>
        <Text
          className="mt-2 text-[22px] font-bold leading-7 tracking-tight"
          style={{ color: palette.accentDeep }}>
          {t('rewards.heroHeadline')}
        </Text>
        <Text className="mt-3 text-xs leading-5" style={{ color: palette.accentDeep }}>
          {t('rewards.heroBody')}
        </Text>
      </View>
      <View className="mt-8 flex-row items-end justify-between">
        <View>
          <Text className="text-[10px] font-bold tracking-[1px]" style={{ color: palette.accent }}>
            YOUR REWARDS
          </Text>
          <Text className="mt-1 text-lg font-bold text-[#24232A]">
            {t('rewards.openedCount', { count: unlockedCount })}
          </Text>
        </View>
        <Text className="text-[11px] text-[#77717D]">{t('rewards.totalCount')}</Text>
      </View>
      <View className="mt-4">
        {rewards.map((reward) => (
          <RewardCard key={reward.kind} reward={reward} />
        ))}
      </View>
      <Text
        className="mx-5 mt-3 text-center text-[11px] leading-5"
        style={{ color: palette.accentDeep }}>
        {t('rewards.pointsNotice')}
      </Text>
      {usedRewards.length ? (
        <View className="mt-8">
          <Text className="text-[10px] font-bold tracking-[1px]" style={{ color: palette.accent }}>
            USED REWARDS
          </Text>
          <Text className="mb-3 mt-1 text-lg font-bold text-[#24232A]">
            {t('rewards.usedCount', { count: usedRewards.length })}
          </Text>
          {usedRewards.map((redemption) => (
            <RedemptionRow key={redemption.id} redemption={redemption} />
          ))}
        </View>
      ) : null}
    </>
  );
}
