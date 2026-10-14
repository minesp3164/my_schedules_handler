import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getDashboard, getRewardRedemptions, getRewardUnlocks } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { t } from '@/services/i18n';
import { getUnlockRewards, type UnlockRewardKind } from '@/services/reward-unlocks';
import { useTheme } from '@/services/theme';
import { Cheer, CheerArrivalPreview } from '@/components/rewards/cheer';
import { FutureLetter } from '@/components/rewards/future-letter';
import { GrowthCard } from '@/components/rewards/growth-card';
import { RecoveryPass } from '@/components/rewards/recovery';
import { Reflection } from '@/components/rewards/reflection';
import { Locked, LoadFailed, PageHeader } from '@/components/rewards/shared';
import { useRewardActions } from '@/components/rewards/useRewardActions';

const kindSet = new Set<UnlockRewardKind>(['cheer', 'recovery', 'reflection', 'future', 'growth']);

export default function RewardDetailScreen() {
  const { kind: requestedKind, preview } = useLocalSearchParams<{
    kind: string;
    preview?: string;
  }>();
  const kind: UnlockRewardKind = kindSet.has(requestedKind as UnlockRewardKind)
    ? (requestedKind as UnlockRewardKind)
    : 'cheer';
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
  const unlocks = useQuery({
    queryKey: ['reward-unlocks'],
    queryFn: () => getRewardUnlocks(token!),
    enabled: Boolean(token),
  });
  const redemptions = useQuery({
    queryKey: ['redemptions'],
    queryFn: () => getRewardRedemptions(token!),
    enabled: Boolean(token),
  });
  const [showArrivalPreview, setShowArrivalPreview] = useState(Boolean(preview));
  const totalPoints = dashboard.data?.total_points ?? 0;
  const state = unlocks.data?.unlocks.find((item) => item.kind === kind);
  const futureLetters = (redemptions.data ?? []).filter(
    (record) => record.reward_kind === 'future'
  );
  const growthCards = (redemptions.data ?? []).filter((record) => record.reward_kind === 'growth');
  const { claimError, onClaim, onStatusChange, onDefer, onUndo } = useRewardActions({
    token,
    kind,
    recordId: state?.record?.id ?? null,
  });

  const reward = useMemo(
    () =>
      getUnlockRewards(
        totalPoints,
        unlocks.data?.weekly_points ?? 0,
        colors.button,
        unlocks.data?.unlocks
      ).find((item) => item.kind === kind)!,
    [kind, totalPoints, unlocks.data, colors.button]
  );

  // 해금된 보상마다 붙는 화면을 조회표로 둔다(kind 순회 if-체인 대신).
  const unlockedContent: Record<UnlockRewardKind, () => ReactNode> = {
    cheer: () => (
      <Cheer
        onRedeem={onClaim}
        accent={reward.color}
        usedRecord={state?.reason === 'used' ? state.record : null}
      />
    ),
    recovery: () =>
      state ? (
        <RecoveryPass
          record={state.record}
          available={state.available}
          progress={state.progress}
          tasks={dashboard.data?.tasks ?? []}
          tasksLoading={dashboard.isLoading}
          deferrals={dashboard.data?.deferrals ?? []}
          onClaim={onClaim}
          onStatusChange={onStatusChange}
          onDefer={onDefer}
          onUndo={onUndo}
          accent={reward.color}
        />
      ) : unlocks.isError ? (
        <LoadFailed />
      ) : null,
    reflection: () => (
      <Reflection
        totalPoints={totalPoints}
        tasks={dashboard.data?.tasks ?? []}
        accent={reward.color}
      />
    ),
    future: () => <FutureLetter accent={reward.color} letters={futureLetters} onRedeem={onClaim} />,
    growth: () =>
      state ? (
        <GrowthCard accent={reward.color} state={state} cards={growthCards} onRedeem={onClaim} />
      ) : unlocks.isError ? (
        <LoadFailed />
      ) : null,
  };

  let content: ReactNode = (
    <Locked
      reward={reward}
      onPreview={kind === 'cheer' ? () => setShowArrivalPreview(true) : undefined}
    />
  );
  if (showArrivalPreview) {
    const savedCheer = preview === 'saved-cheer';
    content = (
      <CheerArrivalPreview
        onClose={() => setShowArrivalPreview(false)}
        message={savedCheer ? t('rewards.cheer.inbox.savedMessage') : undefined}
        detail={savedCheer ? t('rewards.cheer.savedDetail') : undefined}
      />
    );
  } else if (reward.unlocked) {
    content = unlockedContent[kind]();
  }
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <PageHeader title={reward.shortTitle} />
      <ScrollView contentContainerClassName="pb-10">
        {claimError ? (
          <View className="mx-5 mt-2 rounded-xl bg-[#FFE8E3] px-4 py-3">
            <Text className="text-xs font-semibold leading-5 text-[#8A3D2F]">{claimError}</Text>
          </View>
        ) : null}
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}
