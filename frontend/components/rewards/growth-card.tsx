import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { GrowthCardStats, RewardRedemption, RewardUnlockState } from '@/services/api';
import { t } from '@/services/i18n';
import type { OnClaim } from './shared';

function monthLabel(month: string) {
  const [year, mon] = month.split('-');
  return t('rewards.growth.monthLabel', { year, month: Number(mon) });
}

function focusLabel(minutes: number) {
  if (minutes <= 0) return t('rewards.growth.focusZero');
  return minutes >= 60
    ? t('rewards.growth.focusHours', { count: Number((minutes / 60).toFixed(1)) })
    : t('rewards.growth.focusMinutes', { count: minutes });
}

function GrowthCardBody({ stats }: { stats: GrowthCardStats }) {
  return (
    <View className="mt-6 rounded-3xl bg-[#263B64] p-6">
      <Text className="text-xs text-[#C4D0EA]">
        {t('rewards.growth.monthRecord', { month: monthLabel(stats.month) })}
      </Text>
      <Text className="mt-6 text-2xl font-bold leading-8 text-[#FFF9E8]">
        {t('rewards.growth.focusStat', { focus: focusLabel(stats.focus_minutes) })}
      </Text>
      <View className="mt-6 flex-row border-t border-[#FFFFFF33] pt-4">
        <View className="flex-1">
          <Text className="text-lg font-bold text-[#FFF9E8]">{stats.applications}</Text>
          <Text className="text-[10px] text-[#BFCBE0]">{t('rewards.growth.applications')}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-[#FFF9E8]">{stats.goal_days}</Text>
          <Text className="text-[10px] text-[#BFCBE0]">{t('rewards.growth.goalDays')}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-[#FFF9E8]">{stats.activity_days}</Text>
          <Text className="text-[10px] text-[#BFCBE0]">{t('rewards.growth.activeDays')}</Text>
        </View>
      </View>
      <Text className="mt-4 text-[11px] text-[#BFCBE0]">
        {t('rewards.growth.monthPoints', { count: stats.points })}
      </Text>
    </View>
  );
}

function savedCardStats(record: RewardRedemption | null): GrowthCardStats | null {
  const stats = record?.payload.stats;
  return stats && typeof stats === 'object' && !Array.isArray(stats) ? stats : null;
}

export function GrowthCard({
  accent,
  state,
  cards,
  onRedeem,
}: {
  accent: string;
  state: RewardUnlockState;
  cards: RewardRedemption[];
  onRedeem: OnClaim;
}) {
  const [saved, setSaved] = useState(false);
  const usedRecord = state.reason === 'used' ? state.record : null;
  const displayStats = savedCardStats(usedRecord) ?? state.stats;
  const pastCards = cards.filter((card) => card.id !== usedRecord?.id);
  if (!displayStats) return null;

  return (
    <View className="px-5 pt-7">
      <Text className="text-[10px] font-bold tracking-[1.5px] text-[#9B761E]">
        GROWTH ARCHIVE · UNLOCKED
      </Text>
      <Text className="mt-3 text-[29px] font-bold leading-9 tracking-tight text-[#2E2A31]">
        {t('rewards.growth.headline')}
      </Text>
      {saved ? (
        <View className="mt-5 rounded-2xl bg-[#E8EFFF] px-4 py-3">
          <Text className="text-xs font-bold text-[#263B64]">
            {t('rewards.growth.savedToast', { month: monthLabel(displayStats.month) })}
          </Text>
        </View>
      ) : null}
      <GrowthCardBody stats={displayStats} />
      {usedRecord ? (
        <>
          <View className="mt-2 self-start rounded-full bg-[#E8EFFF] px-2.5 py-1">
            <Text className="text-[10px] font-bold text-[#263B64]">
              {t('rewards.growth.thisMonthSaved')}
            </Text>
          </View>
          <Text className="mt-3 text-center text-[11px] text-[#878D7D]">
            {t('rewards.growth.thisMonthSavedBody')}
          </Text>
        </>
      ) : (
        <Pressable
          onPress={async () => {
            const ok = await onRedeem({});
            if (ok) setSaved(true);
          }}
          className="mt-5 flex-row items-center justify-between rounded-2xl border px-5 py-4"
          style={{ borderColor: accent }}>
          <Text className="font-bold" style={{ color: accent }}>
            {t('rewards.growth.save')}
          </Text>
          <Text className="text-xl" style={{ color: accent }}>
            ↓
          </Text>
        </Pressable>
      )}
      {pastCards.length ? (
        <View className="mt-8">
          <Text className="text-[10px] font-bold tracking-[1.5px] text-[#9B761E]">PAST CARDS</Text>
          <Text className="mb-3 mt-1 text-lg font-bold text-[#2E2A31]">
            {t('rewards.growth.pastCount', { count: pastCards.length })}
          </Text>
          {pastCards.map((card) => {
            const stats = savedCardStats(card);
            if (!stats) return null;
            return (
              <View key={card.id} className="mb-2 rounded-2xl bg-[#31456E] p-4">
                <Text className="text-[11px] text-[#C4D0EA]">{monthLabel(stats.month)}</Text>
                <Text className="mt-1 text-sm font-bold text-[#FFF9E8]">
                  {t('rewards.growth.pastSummary', {
                    focus: focusLabel(stats.focus_minutes),
                    applications: stats.applications,
                    days: stats.goal_days,
                  })}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
