import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { getUnlockRewards, rewardRequirement } from '@/services/reward-unlocks';
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

function RewardCard({ reward }: { reward: ReturnType<typeof getUnlockRewards>[number] }) {
  const progressPercent = Math.round((reward.progress / reward.threshold) * 100);
  const remaining = Math.max(reward.threshold - reward.progress, 0);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/rewards/[kind]', params: { kind: reward.kind } })}
      accessibilityRole="button"
      accessibilityLabel={`${reward.title}, ${reward.unlocked ? '사용 가능' : `${remaining}점 남음`}`}
      className="mb-2.5 overflow-hidden rounded-2xl p-4"
      style={{ backgroundColor: reward.softColor }}>
      <View className="flex-row items-start justify-between">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/80">
          <Text className="text-lg" style={{ color: reward.color }}>
            {reward.icon}
          </Text>
        </View>
        <View className="rounded-full bg-white/70 px-2.5 py-1">
          <Text className="text-[10px] font-bold" style={{ color: reward.color }}>
            {reward.unlocked ? '사용 가능' : `${remaining}점 남음`}
          </Text>
        </View>
      </View>
      <Text className="mt-4 text-[17px] font-bold tracking-tight text-[#24232A]">
        {reward.title}
      </Text>
      <Text className="mt-1 text-[11px] leading-4 text-[#5E5B64]">{reward.description}</Text>
      {reward.unlocked ? (
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-[11px] font-bold" style={{ color: reward.color }}>
            열어보기
          </Text>
          <Text className="text-base" style={{ color: reward.color }}>
            →
          </Text>
        </View>
      ) : (
        <View className="mt-3">
          <View className="h-1.5 overflow-hidden rounded-full bg-white/80">
            <View
              className="h-full rounded-full"
              style={{ width: `${progressPercent}%`, backgroundColor: reward.color }}
            />
          </View>
          <Text className="mt-1.5 text-[10px] text-[#6A6670]">
            {rewardRequirement(reward)} · {reward.progress}점 쌓음
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function RewardsScreen() {
  const [section, setSection] = useState<RewardSection>('rewards');
  const [token, setToken] = useState<string | null | undefined>();
  const { palette } = useTheme();
  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard(token!),
    enabled: Boolean(token),
  });
  const totalPoints = dashboard.data?.total_points ?? 0;
  const rewards = getUnlockRewards(totalPoints);
  const unlocked = rewards.filter((reward) => reward.unlocked);
  const next = rewards.find((reward) => !reward.unlocked);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="px-5 pb-8">
        <View className="mt-5 flex-row items-center justify-between">
          <View>
            <Text
              className="text-[10px] font-bold tracking-[2px]"
              style={{ color: palette.accent }}>
              POINT STORE
            </Text>
            <Text className="mt-1 text-2xl font-bold tracking-tight text-[#24232A]">
              포인트 상점
            </Text>
          </View>
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: palette.accentSoft }}>
            <Text className="text-[17px] font-bold" style={{ color: palette.accent }}>
              {totalPoints}
            </Text>
            <Text className="text-[8px]" style={{ color: palette.accent }}>
              보유
            </Text>
          </View>
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
                REDEEM WITH POINTS
              </Text>
              <Text
                className="mt-2 text-[22px] font-bold leading-7 tracking-tight"
                style={{ color: palette.accentDeep }}>
                쌓은 노력으로{`\n`}작은 문을 열어요.
              </Text>
              <Text className="mt-3 text-xs leading-5" style={{ color: palette.accentDeep }}>
                할 일을 완료해 포인트를 모으고, 원하는 회복 경험을 직접 골라 사용해요.
              </Text>
            </View>
            <View
              className="mt-4 flex-row items-center rounded-2xl border bg-white p-4"
              style={{ borderColor: palette.line }}>
              <Text className="mr-3 text-xl" style={{ color: palette.accent }}>
                ✦
              </Text>
              <View className="flex-1">
                <Text className="text-xs font-bold text-[#37323F]">
                  보유 포인트 {totalPoints}점
                </Text>
                <Text className="mt-1 text-[11px]" style={{ color: palette.accentDeep }}>
                  {next
                    ? `${next.shortTitle}까지 ${Math.max(next.threshold - next.progress, 0)}점 남았어요.`
                    : '모든 보상을 구매할 수 있어요.'}
                </Text>
              </View>
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
              보상 구매 시 해당 포인트가 차감돼요. 쉬고 돌아보고 다시 시작하도록 돕는 경험이에요.
            </Text>
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
