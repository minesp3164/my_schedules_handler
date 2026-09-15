import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { getMilestones } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import {
  builderBadge,
  currentRank,
  formatTrackValue,
  nextRank,
  overallRank,
  rankTracks,
  trackValue,
} from '@/services/milestones';
import { useTheme } from '@/services/theme';

export default function MilestonesScreen() {
  const [token, setToken] = useState<string | null>();
  const { palette } = useTheme();
  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);

  const query = useQuery({
    queryKey: ['milestones'],
    queryFn: () => getMilestones(token!),
    enabled: Boolean(token),
  });
  const progress = query.data;
  const overall = useMemo(() => (progress ? overallRank(progress) : null), [progress]);
  const badge = progress ? builderBadge(progress.created_tasks) : null;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="px-5 pb-10">
        <View className="mt-3 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="뒤로 가기"
            className="h-10 w-10 items-center justify-center">
            <Text className="text-2xl" style={{ color: palette.accentDeep }}>
              ‹
            </Text>
          </Pressable>
          <Text className="text-base font-bold" style={{ color: palette.accentDeep }}>
            나의 성장 등급
          </Text>
          <View
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: palette.accentSoft }}>
            <Text className="text-xs font-bold" style={{ color: palette.accentDeep }}>
              나
            </Text>
          </View>
        </View>

        <View
          className="mt-6 overflow-hidden rounded-[26px] p-5"
          style={{ backgroundColor: palette.accentSoft }}>
          <Text
            className="text-[11px] font-bold tracking-[1.4px]"
            style={{ color: palette.accentDeep }}>
            CURRENT RANK
          </Text>
          <Text
            className="mt-2 text-[26px] font-bold leading-9 tracking-tight"
            style={{ color: palette.accentDeep }}>
            {overall?.name ?? '랭크를 계산하는 중'}
          </Text>
          <Text className="mt-2 text-xs leading-5" style={{ color: palette.accentDeep }}>
            분야별 랭크의 평균으로 성장 등급이 정해져요.
          </Text>
          <View
            className="mt-5 h-24 w-24 items-center justify-center self-center rounded-full border-[10px] bg-white"
            style={{
              borderColor: palette.line,
              borderTopColor: palette.accent,
              borderRightColor: palette.accent,
            }}>
            <Text className="text-2xl font-bold" style={{ color: palette.accentDeep }}>
              {overall?.shortName ?? '…'}
            </Text>
            <Text className="text-[10px]" style={{ color: palette.accentDeep }}>
              성장 등급
            </Text>
          </View>
        </View>

        <View className="mt-7 flex-row items-end justify-between">
          <View>
            <Text
              className="text-[10px] font-bold tracking-[1.2px]"
              style={{ color: palette.accentDeep }}>
              RANK PROGRESS
            </Text>
            <Text className="mt-1 text-lg font-bold" style={{ color: palette.accentDeep }}>
              분야별 랭크
            </Text>
          </View>
          <Text className="text-xs" style={{ color: palette.accentDeep }}>
            브론즈 → 다이아
          </Text>
        </View>

        {query.isError ? (
          <Text className="mt-4 text-sm text-[#C25B5B]">랭크를 불러오지 못했어요.</Text>
        ) : null}

        <View className="mt-4">
          {rankTracks.map((track) => {
            const value = progress ? trackValue(track, progress) : 0;
            const rank = progress ? currentRank(track, progress) : null;
            const next = progress ? nextRank(track, progress) : null;
            const percent = next ? Math.min((value / next.threshold) * 100, 100) : 100;

            return (
              <View
                key={track.id}
                className="mb-3 rounded-[18px] border bg-white p-4"
                style={{ borderColor: palette.line }}>
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
                  style={{ backgroundColor: palette.line }}>
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${percent}%`, backgroundColor: palette.accent }}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <View
          className="mt-4 rounded-2xl border bg-white p-4"
          style={{ borderColor: palette.line }}>
          <Text
            className="text-[10px] font-bold tracking-[1px]"
            style={{ color: palette.accentDeep }}>
            BONUS BADGE
          </Text>
          <Text className="mt-1 text-[14px] font-bold text-[#303B34]">
            {badge?.title ?? '첫 루틴을 만들어볼까요?'}
          </Text>
          <Text className="mt-1 text-[11px] leading-5 text-[#778078]">
            {badge?.description ??
              '할 일을 추가하면 랭크와 별개로 루틴 설계 배지를 받을 수 있어요.'}
          </Text>
        </View>

        <Text className="mx-4 mt-5 text-center text-[11px] leading-5 text-[#879087]">
          공백이 있어도 괜찮아요. 이미 쌓인 노력과 랭크는 내려가지 않아요.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
