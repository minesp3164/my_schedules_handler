import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { Badge, BadgeCategory, MilestoneProgress } from '@/services/api';
import { getBadges, getMilestones } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import {
  badgeCategories,
  categoryLabels,
  formatBadgeDate,
  isAchievedToday,
  medalColor,
  needText,
} from '@/services/badges';
import {
  currentRank,
  formatTrackValue,
  nextRank,
  overallRank,
  rankTracks,
  trackValue,
} from '@/services/milestones';
import { useTheme } from '@/services/theme';

// 채택안(footprint-02): 앨범 그리드 발자국. 미달성 배지는 기본 숨김, 토글로만 전체 조회한다.
export default function FootprintScreen() {
  const [token, setToken] = useState<string | null>();
  const [category, setCategory] = useState<BadgeCategory | 'all'>('all');
  const [showLocked, setShowLocked] = useState(false);
  const { palette } = useTheme();

  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);

  const badges = useQuery({
    queryKey: ['badges'],
    queryFn: () => getBadges(token!),
    enabled: Boolean(token),
  });
  // 쌓인 노력(성장 등급·분야별 랭크): 기록탭의 마일스톤 화면을 이 화면으로 통합했다.
  const milestones = useQuery({
    queryKey: ['milestones'],
    queryFn: () => getMilestones(token!),
    enabled: Boolean(token),
  });
  const milestoneProgress = milestones.data;
  const overall = milestoneProgress ? overallRank(milestoneProgress) : null;
  const data = badges.data;
  const progress = data?.progress ?? null;
  const all = data?.badges ?? [];
  const achievedCount = all.filter((badge) => badge.achieved_at).length;
  const inCategory = all.filter((badge) => category === 'all' || badge.category === category);
  const lockedCount = inCategory.filter((badge) => !badge.achieved_at).length;
  const visible = inCategory.filter((badge) => showLocked || badge.achieved_at);
  const total = all.length;
  const percent = total ? Math.round((achievedCount / total) * 100) : 0;
  const firstRecord = progress?.first_activity_date;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="px-5 pb-8">
        <View className="mt-3 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="뒤로 가기"
            className="h-10 w-10 items-center justify-center">
            <Text className="text-2xl" style={{ color: palette.accentDeep }}>
              ‹
            </Text>
          </Pressable>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-white/60">
            <Text className="text-xs" style={{ color: palette.accentDeep }}>
              👣
            </Text>
          </View>
        </View>

        <View className="mt-3">
          <Text
            className="text-[10px] font-extrabold tracking-[2.4px]"
            style={{ color: palette.accent }}>
            MY FOOTPRINT
          </Text>
          <Text className="mt-1.5 text-[26px] font-black tracking-[-0.6px] text-[#26332D]">
            나의 발자국
          </Text>
          <Text className="mt-1.5 text-[13px] text-[#98A199]">
            {data
              ? `지금까지 모은 배지 ${achievedCount}개 · 배지 종류 총 ${total}개${
                  firstRecord ? ` · 첫 기록 ${formatBadgeDate(firstRecord)}` : ''
                }${overall ? ` · 성장 등급 ${overall.name}` : ''}`
              : '발자국을 불러오는 중이에요.'}
          </Text>
        </View>

        <View className="mt-3.5 flex-row items-center gap-3">
          <View
            className="h-2.5 flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: '#E4EAE3' }}>
            <View
              className="h-full rounded-full"
              style={{ width: `${percent}%`, backgroundColor: palette.accent }}
            />
          </View>
          <Text className="text-[12.5px] font-extrabold" style={{ color: palette.accent }}>
            {data ? `${achievedCount} / ${total}` : '…'}
          </Text>
        </View>

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: showLocked }}
          accessibilityLabel="미달성 배지 보이기"
          onPress={() => setShowLocked((current) => !current)}
          className="mt-3.5 flex-row items-center justify-between rounded-2xl border bg-white px-4 py-3"
          style={{ borderColor: '#E4EAE3' }}>
          <View className="mr-3 flex-1">
            <Text className="text-[13.5px] font-bold text-[#303B34]">
              미달성 배지 보이기 <Text style={{ color: '#B4BCB3' }}>({lockedCount}개 잠김)</Text>
            </Text>
            <Text className="mt-[3px] text-[11px] text-[#A2ABA2]">
              숨겨진 배지는 압박하지 않아요
            </Text>
          </View>
          <View
            style={{
              width: 46,
              height: 27,
              borderRadius: 99,
              padding: 3,
              justifyContent: 'center',
              backgroundColor: showLocked ? palette.accent : '#D7DDD6',
            }}>
            <View
              style={{
                width: 21,
                height: 21,
                borderRadius: 99,
                backgroundColor: '#fff',
                alignSelf: showLocked ? 'flex-end' : 'flex-start',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
                elevation: 2,
              }}
            />
          </View>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerClassName="gap-2 pb-1">
          {badgeCategories.map((option) => {
            const selected = category === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                onPress={() => setCategory(option.key)}
                className="rounded-full border px-[15px] py-2"
                style={{
                  backgroundColor: selected ? palette.accentDeep : palette.surface,
                  borderColor: selected ? palette.accentDeep : '#E4EAE3',
                }}>
                <Text
                  className="text-[12.5px] font-bold"
                  style={{ color: selected ? '#fff' : '#778078' }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {badges.isError ? (
          <Text className="mt-4 text-sm text-[#C25B5B]">발자국을 불러오지 못했어요.</Text>
        ) : null}

        <View className="mt-3 flex-row flex-wrap" style={{ gap: 13 }}>
          {visible.map((badge) => (
            <BadgeCard key={badge.key} badge={badge} progress={progress} />
          ))}
        </View>
        {data && visible.length === 0 ? (
          <Text className="py-10 text-center text-[13px] text-[#B4BCB3]">
            이 카테고리의 배지는 아직 없어요.
          </Text>
        ) : null}
        {!data && !badges.isError ? (
          <Text className="py-10 text-center text-[13px] text-[#B4BCB3]">
            배지를 모으는 중이에요.
          </Text>
        ) : null}

        {/* 쌓인 노력: 기록탭의 마일스톤 화면(성장 등급·분야별 랭크)을 한 화면으로 통합했다. */}
        <View className="mt-8">
          <Text
            className="text-[10px] font-extrabold tracking-[2.4px]"
            style={{ color: palette.accent }}>
            GROWTH RANK
          </Text>
          <Text className="mt-1.5 text-[22px] font-black tracking-[-0.5px] text-[#26332D]">
            쌓인 노력
          </Text>
          <Text className="mt-1 text-[12.5px] text-[#98A199]">
            분야별 랭크의 평균으로 성장 등급이 정해져요.
          </Text>
        </View>

        {milestones.isError ? (
          <Text className="mt-3 text-sm text-[#C25B5B]">랭크를 불러오지 못했어요.</Text>
        ) : null}

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
                {overall?.name ?? '랭크를 계산하는 중'}
              </Text>
              <Text
                className="mt-1.5 text-[11.5px] leading-5"
                style={{ color: palette.accentDeep }}>
                브론즈에서 다이아까지, 쌓인 노력이 등급이 돼요.
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
                성장 등급
              </Text>
            </View>
          </View>
        </View>

        {rankTracks.map((track) => {
          const value = milestoneProgress ? trackValue(track, milestoneProgress) : 0;
          const rank = milestoneProgress ? currentRank(track, milestoneProgress) : null;
          const next = milestoneProgress ? nextRank(track, milestoneProgress) : null;
          const percent = next ? Math.min((value / next.threshold) * 100, 100) : 100;

          return (
            <View
              key={track.id}
              className="mt-3 rounded-[20px] border bg-white p-4"
              style={{ borderColor: '#E4EAE3' }}>
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
                  <Text className="mt-1 text-[10px] text-[#778078]">
                    {formatTrackValue(track, value)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs font-bold" style={{ color: palette.accent }}>
                    {rank?.name ?? '브론즈'}
                  </Text>
                  <Text className="mt-1 text-[10px] text-[#778078]">
                    {next
                      ? `${next.tier.name}까지 ${formatTrackValue(track, Math.max(next.threshold - value, 0))}`
                      : '다이아 달성'}
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
        })}

        <View className="mt-5 border-t border-[#E9EDE7] pb-2 pt-2.5">
          <Text className="text-center text-[11.5px] leading-[18px] text-[#A2ABA2]">
            공백이 있어도 괜찮아요. 이미 쌓인 노력과 배지는 내려가지 않아요.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BadgeCard({ badge, progress }: { badge: Badge; progress: MilestoneProgress | null }) {
  const achieved = Boolean(badge.achieved_at);
  const { palette } = useTheme();
  const need = achieved || !progress ? null : needText(badge, progress);

  return (
    <View style={{ width: '47.5%' }}>
      <View
        className="relative rounded-[20px] border"
        style={{
          backgroundColor: achieved ? palette.surface : '#F2F4F0',
          borderColor: '#E4EAE3',
          borderStyle: achieved ? 'solid' : 'dashed',
          paddingHorizontal: 14,
          paddingTop: 15,
          paddingBottom: 15,
        }}>
        {achieved && isAchievedToday(badge) ? (
          <View
            className="absolute -top-[9px] right-3 rounded-full border-2 border-white px-2 py-1"
            style={{ backgroundColor: '#FF6B4A' }}>
            <Text className="text-[9.5px] font-black tracking-[1px] text-white">NEW</Text>
          </View>
        ) : null}
        <Text
          className="absolute right-3.5 top-3.5 text-[9.5px] font-extrabold tracking-[0.5px]"
          style={{ color: '#B4BCB3' }}>
          {categoryLabels[badge.category]}
        </Text>

        <View
          style={
            achieved
              ? {
                  width: 54,
                  height: 54,
                  borderRadius: 99,
                  backgroundColor: medalColor(badge.category),
                  borderWidth: 2.5,
                  borderColor: '#26332D',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#26332D',
                  shadowOffset: { width: 3, height: 3 },
                  shadowOpacity: 0.85,
                  shadowRadius: 0,
                  elevation: 3,
                }
              : {
                  width: 54,
                  height: 54,
                  borderRadius: 99,
                  backgroundColor: '#E4EAE3',
                  borderWidth: 1.5,
                  borderColor: '#C4CCC3',
                  borderStyle: 'dashed',
                  alignItems: 'center',
                  justifyContent: 'center',
                }
          }>
          <Text className="text-[24px]">{badge.icon}</Text>
        </View>

        <Text
          className="mt-[11px] text-[14.5px] font-extrabold"
          style={{ color: achieved ? '#303B34' : '#A2ABA2' }}>
          {badge.title}
        </Text>
        <Text className="mt-[5px] text-[11px] leading-4 text-[#98A199]">{badge.description}</Text>

        {achieved ? (
          <Text
            className="mt-[9px] self-start rounded-lg px-2 py-1 text-[10.5px] font-bold"
            style={{ backgroundColor: palette.accentSoft, color: palette.accent }}>
            {formatBadgeDate(badge.achieved_at)}
          </Text>
        ) : need ? (
          <Text
            className="mt-[9px] self-start rounded-lg px-2 py-1 text-[10.5px] font-bold"
            style={{ backgroundColor: '#E9EDE7', color: '#98A199' }}>
            {need}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
