import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getDashboard, getRewardRedemptions, getRewardUnlocks, type RewardRedemption } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { formatShortDate } from '@/services/i18n';
import { getUnlockRewards, rewardRequirement, type UnlockReward } from '@/services/reward-unlocks';
import { useTheme } from '@/services/theme';

type RewardSection = 'rewards' | 'cheers';

const inboxCheers = [
  {
    id: 'new-cheer',
    label: 'NEW',
    date: '방금 도착',
    message: '오늘 한 번 시작했다는 것만으로도 충분해요.',
    accent: '#E85E4A',
  },
  {
    id: 'saved-cheer',
    label: '다시 읽기',
    date: '어제',
    message: '작게 쌓은 하루도 분명 당신의 편이에요.',
    accent: '#9B7B60',
  },
];

// 카드 상단 배지: 잠김/해금 가능/보유/이미 사용한 상태를 한 줄로 알린다.
function badgeFor(reward: UnlockReward) {
  if (!reward.unlocked) return `${Math.max(reward.threshold - reward.progress, 0)}점 남음`;
  if (reward.available) return reward.kind === 'recovery' ? '보상 받기' : '사용 가능';
  if (reward.reason === 'held') return '보유 중';
  if (reward.reason === 'used') return reward.kind === 'cheer' ? '이번 주 완료' : '이번 달 완료';
  return '곧 열려요';
}

function RewardCard({ reward }: { reward: ReturnType<typeof getUnlockRewards>[number] }) {
  const progressPercent = Math.round((reward.progress / reward.threshold) * 100);
  const badge = badgeFor(reward);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/rewards/[kind]', params: { kind: reward.kind } })}
      accessibilityRole="button"
      accessibilityLabel={`${reward.title}, ${badge}`}
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
      <Text
        className="mt-4 text-[17px] font-bold tracking-tight"
        style={{ color: reward.onColor }}>
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
            열어보기
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

function redemptionPreview(redemption: RewardRedemption) {
  const { payload } = redemption;
  const value = payload.message ?? payload.letter ?? payload.task_title ?? payload.win;
  return typeof value === 'string' ? value : '';
}

function RedemptionRow({ redemption }: { redemption: RewardRedemption }) {
  const { palette, colors } = useTheme();
  const meta = getUnlockRewards(0, 0, colors.button).find(
    (reward) => reward.kind === redemption.reward_kind
  );
  const preview = redemptionPreview(redemption);
  const usedAt = redemption.redeemed_at ?? redemption.unlocked_at;
  return (
    <View className="mb-2 rounded-2xl border p-4" style={{ borderColor: palette.line, backgroundColor: palette.surface }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-[#24232A]">
          {meta?.icon} {meta?.shortTitle ?? redemption.reward_kind}
        </Text>
        <View className="flex-row items-center gap-2">
          {redemption.cost_points ? (
            <Text className="text-[10px] font-bold text-[#B25E50]">-{redemption.cost_points}점</Text>
          ) : (
            <Text className="text-[10px] font-bold" style={{ color: palette.accent }}>
              해금 보상
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
  const unlocked = rewards.filter((reward) => reward.unlocked);
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
              보상
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/point-history')}
            accessibilityRole="button"
            accessibilityLabel={`보유 포인트 ${totalPoints}점, 포인트 내역 보기`}
            accessibilityHint="포인트가 쌓이거나 사용된 기록을 확인해요."
            className="min-h-11 min-w-14 items-center justify-center rounded-xl border px-2"
            style={{ backgroundColor: palette.accentSoft, borderColor: palette.line }}>
            <Text className="text-[9px] font-bold tracking-[1px] text-muted">POINTS</Text>
            <Text className="mt-px text-base font-bold" style={{ color: palette.accent }}>
              {totalPoints}
            </Text>
          </Pressable>
        </View>
        <View
          className="mt-6 flex-row rounded-2xl p-1"
          style={{ backgroundColor: palette.accentSoft }}>
          <Pressable
            onPress={() => setSection('rewards')}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === 'rewards' }}
            className={`min-h-11 flex-1 items-center justify-center rounded-xl ${section === 'rewards' ? 'bg-white' : ''}`}>
            <Text
              className="text-sm font-bold"
              style={{ color: section === 'rewards' ? palette.accent : '#8A8590' }}>
              해금 보상
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSection('cheers')}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === 'cheers' }}
            className={`min-h-11 flex-1 flex-row items-center justify-center rounded-xl ${section === 'cheers' ? 'bg-white' : ''}`}>
            <Text
              className="text-sm font-bold"
              style={{ color: section === 'cheers' ? palette.accent : '#8A8590' }}>
              응원 보관함
            </Text>
            <View className="ml-1.5 h-1.5 w-1.5 rounded-full bg-[#E85E4A]" />
          </Pressable>
        </View>
        {section === 'rewards' ? (
          <>
            <View
              className="mt-4 rounded-3xl px-5 py-5"
              style={{ backgroundColor: palette.accentSoft }}>
              <Text
                className="text-[10px] font-bold tracking-[1px]"
                style={{ color: palette.accent }}>
                UNLOCK WITH POINTS
              </Text>
              <Text
                className="mt-2 text-[22px] font-bold leading-7 tracking-tight"
                style={{ color: palette.accentDeep }}>
                쌓은 노력으로{`\n`}작은 문을 열어요.
              </Text>
              <Text className="mt-3 text-xs leading-5" style={{ color: palette.accentDeep }}>
                할 일을 완료해 포인트를 모으면 보상이 열려요. 포인트는 차감되지 않아요.
              </Text>
            </View>
            <View className="mt-8 flex-row items-end justify-between">
              <View>
                <Text
                  className="text-[10px] font-bold tracking-[1px]"
                  style={{ color: palette.accent }}>
                  YOUR REWARDS
                </Text>
                <Text className="mt-1 text-lg font-bold text-[#24232A]">
                  열린 보상 {unlocked.length}개
                </Text>
              </View>
              <Text className="text-[11px] text-[#77717D]">총 5개</Text>
            </View>
            <View className="mt-4">
              {rewards.map((reward) => (
                <RewardCard key={reward.kind} reward={reward} />
              ))}
            </View>
            <Text
              className="mx-5 mt-3 text-center text-[11px] leading-5"
              style={{ color: palette.accentDeep }}>
              해금 보상은 포인트를 차감하지 않아요. 주간 회고를 처음 저장할 때만 300점이
              사용돼요.
            </Text>
            {usedRewards.length ? (
              <View className="mt-8">
                <Text
                  className="text-[10px] font-bold tracking-[1px]"
                  style={{ color: palette.accent }}>
                  USED REWARDS
                </Text>
                <Text className="mt-1 mb-3 text-lg font-bold text-[#24232A]">
                  사용한 보상 {usedRewards.length}개
                </Text>
                {usedRewards.map((redemption) => (
                  <RedemptionRow key={redemption.id} redemption={redemption} />
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <View className="mt-5">
            <Text
              className="text-[10px] font-bold tracking-[1.5px]"
              style={{ color: palette.accent }}>
              KIND NOTES
            </Text>
            <Text className="mt-2 text-[23px] font-bold tracking-tight text-[#302B2F]">
              응원 보관함
            </Text>
            <Text className="mt-2 text-xs leading-5 text-[#7B7374]">
              답장이나 반응 없이, 필요할 때만 조용히 다시 읽을 수 있어요.
            </Text>
            <View className="mt-6 gap-3">
              {inboxCheers.map((cheer) => (
                <Pressable
                  key={cheer.id}
                  onPress={() =>
                    router.push({
                      pathname: '/rewards/[kind]',
                      params: { kind: 'cheer', preview: cheer.id },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${cheer.label} 응원, ${cheer.message}`}
                  className="rounded-3xl border p-5"
                  style={{ backgroundColor: palette.accentSoft, borderColor: palette.line }}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View
                        className="h-9 w-9 items-center justify-center rounded-xl"
                        style={{ backgroundColor: palette.surface }}>
                        <Text className="text-lg" style={{ color: palette.accent }}>
                          ✉
                        </Text>
                      </View>
                      <View className="ml-3">
                        <Text className="text-xs font-bold text-[#584B4C]">익명의 누군가</Text>
                        <Text className="mt-0.5 text-[10px] text-[#9A8D8E]">{cheer.date}</Text>
                      </View>
                    </View>
                    <View
                      className="rounded-full px-2.5 py-1"
                      style={{ backgroundColor: `${cheer.accent}1A` }}>
                      <Text className="text-[10px] font-bold" style={{ color: cheer.accent }}>
                        {cheer.label}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-5 text-[17px] font-bold leading-6 text-[#372E2F]">
                    {cheer.message}
                  </Text>
                  <Text className="mt-4 text-xs font-bold" style={{ color: palette.accent }}>
                    열어보기 →
                  </Text>
                </Pressable>
              ))}
            </View>
            <View
              className="mt-5 flex-row rounded-2xl p-4"
              style={{ backgroundColor: palette.accentSoft }}>
              <Text className="mr-3 text-base" style={{ color: palette.accent }}>
                ⌁
              </Text>
              <Text className="flex-1 text-[11px] leading-5" style={{ color: palette.accentDeep }}>
                좋아요·답장·프로필은 없어요. 숨긴 응원은 보관함에서 즉시 사라지고, 신고는 검토
                대상으로 이동해요.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
