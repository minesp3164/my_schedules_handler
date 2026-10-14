import { Text, View } from 'react-native';
import type { RewardRedemption } from '@/services/api';
import { formatShortDate, t } from '@/services/i18n';
import { getUnlockRewards } from '@/services/reward-unlocks';
import { useTheme } from '@/services/theme';

function redemptionPreview(redemption: RewardRedemption) {
  const { payload } = redemption;
  const value = payload.message ?? payload.letter ?? payload.task_title ?? payload.win;
  return typeof value === 'string' ? value : '';
}

// 사용한 보상 기록 한 줄: 종류 · 비용 · 사용일 · 내용 미리보기.
export function RedemptionRow({ redemption }: { redemption: RewardRedemption }) {
  const { palette, colors } = useTheme();
  const meta = getUnlockRewards(0, 0, colors.button).find(
    (reward) => reward.kind === redemption.reward_kind
  );
  const preview = redemptionPreview(redemption);
  const usedAt = redemption.redeemed_at ?? redemption.unlocked_at;
  return (
    <View
      className="mb-2 rounded-2xl border p-4"
      style={{ borderColor: palette.line, backgroundColor: palette.surface }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-[#24232A]">
          {meta?.icon} {meta?.shortTitle ?? redemption.reward_kind}
        </Text>
        <View className="flex-row items-center gap-2">
          {redemption.cost_points ? (
            <Text className="text-[10px] font-bold text-[#B25E50]">
              {t('rewards.used.costPoints', { count: redemption.cost_points })}
            </Text>
          ) : (
            <Text className="text-[10px] font-bold" style={{ color: palette.accent }}>
              {t('rewards.used.freeReward')}
            </Text>
          )}
          <Text className="text-[10px] text-muted">{formatShortDate(new Date(usedAt))}</Text>
        </View>
      </View>
      {preview ? (
        <Text className="mt-2 text-xs leading-5 text-[#5E5B64]" numberOfLines={2}>
          {preview}
        </Text>
      ) : null}
    </View>
  );
}
