import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { BadgeCategory } from '@/services/api';
import { getBadges, getMilestones } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { formatBadgeDate } from '@/services/badges';
import { overallRank, rankTracks } from '@/services/milestones';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import { BadgeCard } from '@/components/footprint/BadgeCard';
import { CategoryChips } from '@/components/footprint/CategoryChips';
import { GrowthRankCard } from '@/components/footprint/GrowthRankCard';
import { LockedToggle } from '@/components/footprint/LockedToggle';
import { RankTrackCard } from '@/components/footprint/RankTrackCard';

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
            accessibilityLabel={t('common.back')}
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
            {t('footprint.screen.title')}
          </Text>
          <Text className="mt-1.5 text-[13px] text-[#98A199]">
            {data
              ? t('footprint.screen.subtitle', { achieved: achievedCount, total }) +
                (firstRecord
                  ? t('footprint.screen.subtitleFirstRecord', {
                      date: formatBadgeDate(firstRecord),
                    })
                  : '') +
                (overall ? t('footprint.screen.subtitleRank', { name: overall.name }) : '')
              : t('footprint.screen.loading')}
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

        <LockedToggle
          showLocked={showLocked}
          lockedCount={lockedCount}
          onToggle={() => setShowLocked((current) => !current)}
        />

        <CategoryChips category={category} onSelect={setCategory} />

        {badges.isError ? (
          <Text className="mt-4 text-sm text-[#C25B5B]">{t('footprint.screen.loadError')}</Text>
        ) : null}

        <View className="mt-3 flex-row flex-wrap" style={{ gap: 13 }}>
          {visible.map((badge) => (
            <BadgeCard key={badge.key} badge={badge} progress={progress} />
          ))}
        </View>
        {data && visible.length === 0 ? (
          <Text className="py-10 text-center text-[13px] text-[#B4BCB3]">
            {t('footprint.screen.emptyCategory')}
          </Text>
        ) : null}
        {!data && !badges.isError ? (
          <Text className="py-10 text-center text-[13px] text-[#B4BCB3]">
            {t('footprint.screen.collecting')}
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
            {t('footprint.screen.rankTitle')}
          </Text>
          <Text className="mt-1 text-[12.5px] text-[#98A199]">
            {t('footprint.screen.rankSubtitle')}
          </Text>
        </View>

        {milestones.isError ? (
          <Text className="mt-3 text-sm text-[#C25B5B]">{t('footprint.screen.rankLoadError')}</Text>
        ) : null}

        <GrowthRankCard overall={overall} />

        {rankTracks.map((track) => (
          <RankTrackCard key={track.id} track={track} progress={milestoneProgress ?? null} />
        ))}

        <View className="mt-5 border-t border-[#E9EDE7] pb-2 pt-2.5">
          <Text className="text-center text-[11.5px] leading-[18px] text-[#A2ABA2]">
            {t('footprint.screen.footerNote')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
