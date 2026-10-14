import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { getUnlockRewards, rewardRequirement } from '@/services/reward-unlocks';
import { t } from '@/services/i18n';

// 카드 상단 배지: 잠김/해금 가능/보유/이미 사용한 상태를 한 줄로 알린다.
function badgeFor(reward: ReturnType<typeof getUnlockRewards>[number]) {
  if (!reward.unlocked)
    return t('rewards.status.pointsLeft', {
      count: Math.max(reward.threshold - reward.progress, 0),
    });
  if (reward.available)
    return reward.kind === 'recovery'
      ? t('rewards.status.claimReward')
      : t('rewards.status.usable');
  if (reward.reason === 'held') return t('rewards.status.held');
  if (reward.reason === 'used')
    return reward.kind === 'cheer' ? t('rewards.status.weekDone') : t('rewards.status.monthDone');
  return t('rewards.status.soon');
}

// 해금 보상 한 장: 잠김이면 진행 막대, 해금이면 열기 안내를 보여준다.
export function RewardCard({ reward }: { reward: ReturnType<typeof getUnlockRewards>[number] }) {
  const progressPercent = Math.round((reward.progress / reward.threshold) * 100);
  const badge = badgeFor(reward);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/rewards/[kind]', params: { kind: reward.kind } })}
      accessibilityRole="button"
      accessibilityLabel={t('rewards.card.accessibility', { title: reward.title, badge })}
      className="mb-2.5 overflow-hidden rounded-2xl p-4"
      style={{ backgroundColor: reward.softColor }}>
      <View className="flex-row items-start justify-between">
        <View
          className={`h-9 w-9 items-center justify-center rounded-xl ${reward.dark ? 'bg-white/20' : 'bg-white/80'}`}>
          <Text className="text-lg" style={{ color: reward.dark ? '#FFFFFF' : reward.color }}>
            {reward.icon}
          </Text>
        </View>
        <View className={`rounded-full px-2.5 py-1 ${reward.dark ? 'bg-white/20' : 'bg-white/70'}`}>
          <Text
            className="text-[10px] font-bold"
            style={{ color: reward.dark ? '#FFFFFF' : reward.color }}>
            {badge}
          </Text>
        </View>
      </View>
      <Text className="mt-4 text-[17px] font-bold tracking-tight" style={{ color: reward.onColor }}>
        {reward.title}
      </Text>
      <Text className="mt-1 text-[11px] leading-4" style={{ color: reward.onSoft }}>
        {reward.description}
      </Text>
      {reward.unlocked ? (
        <View className="mt-3 flex-row items-center justify-between">
          <Text
            className="text-[11px] font-bold"
            style={{ color: reward.dark ? '#FFFFFF' : reward.color }}>
            {t('rewards.card.open')}
          </Text>
          <Text className="text-base" style={{ color: reward.dark ? '#FFFFFF' : reward.color }}>
            →
          </Text>
        </View>
      ) : (
        <View className="mt-3">
          <View
            className={`h-1.5 overflow-hidden rounded-full ${reward.dark ? 'bg-white/25' : 'bg-white/80'}`}>
            <View
              className="h-full rounded-full"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: reward.dark ? '#FFFFFF' : reward.color,
              }}
            />
          </View>
          <Text className="mt-1.5 text-[10px]" style={{ color: reward.onSoft }}>
            {rewardRequirement(reward)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
