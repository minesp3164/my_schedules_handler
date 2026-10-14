import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getDashboard, getRewardRedemptions, getRewardUnlocks } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { t } from '@/services/i18n';
import { getUnlockRewards } from '@/services/reward-unlocks';
import { useTheme } from '@/services/theme';
import { CheerBoxSection } from '@/components/rewards/CheerBoxSection';
import { SectionTabs, type RewardSection } from '@/components/rewards/SectionTabs';
import { UnlocksSection } from '@/components/rewards/UnlocksSection';

export default function RewardsScreen() {
  const [section, setSection] = useState<RewardSection>('rewards');
  const [token, setToken] = useState<string | null | undefined>();
  const { palette, colors } = useTheme();
  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard(token!),
    enabled: Boolean(token),
  });
  const redemptions = useQuery({
    queryKey: ['redemptions'],
    queryFn: () => getRewardRedemptions(token!),
    enabled: Boolean(token),
  });
  const unlocks = useQuery({
    queryKey: ['reward-unlocks'],
    queryFn: () => getRewardUnlocks(token!),
    enabled: Boolean(token),
  });
  const totalPoints = dashboard.data?.total_points ?? 0;
  const rewards = getUnlockRewards(
    totalPoints,
    unlocks.data?.weekly_points ?? 0,
    colors.button,
    unlocks.data?.unlocks
  );
  const unlockedCount = rewards.filter((reward) => reward.unlocked).length;
  const usedRewards = (redemptions.data ?? []).filter(
    (redemption) => redemption.status === 'redeemed'
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="px-5 pb-8">
        <View className="mt-5 flex-row items-center justify-between">
          <View>
            <Text
              className="text-[10px] font-bold tracking-[2px]"
              style={{ color: palette.accent }}>
              REWARDS
            </Text>
            <Text className="mt-1 text-2xl font-bold tracking-tight text-[#24232A]">
              {t('rewards.title')}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/point-history')}
            accessibilityRole="button"
            accessibilityLabel={t('rewards.pointsAccessibility', { count: totalPoints })}
            accessibilityHint={t('rewards.pointsHint')}
            className="min-h-11 min-w-14 items-center justify-center rounded-xl border px-2"
            style={{ backgroundColor: palette.accentSoft, borderColor: palette.line }}>
            <Text className="text-[9px] font-bold tracking-[1px] text-muted">POINTS</Text>
            <Text className="mt-px text-base font-bold" style={{ color: palette.accent }}>
              {totalPoints}
            </Text>
          </Pressable>
        </View>
        <SectionTabs section={section} onChange={setSection} />
        {section === 'rewards' ? (
          <UnlocksSection
            rewards={rewards}
            unlockedCount={unlockedCount}
            usedRewards={usedRewards}
          />
        ) : (
          <CheerBoxSection />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
