import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { UnlockReward } from '@/services/reward-unlocks';
import { t } from '@/services/i18n';

export type ClaimPayload = Record<string, string | number | undefined>;
export type OnClaim = (payload: ClaimPayload) => Promise<boolean>;
export type OnStatusChange = (status: 'unlocked' | 'skipped') => Promise<boolean>;

export function PageHeader({ title }: { title: string }) {
  return (
    <View className="flex-row items-center justify-between px-5 pb-3 pt-3">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        className="h-10 w-10 items-center justify-center">
        <Text className="text-3xl text-[#28252D]">‹</Text>
      </Pressable>
      <Text className="text-sm font-bold text-[#28252D]">{title}</Text>
      <View className="h-10 w-10" />
    </View>
  );
}

// 해금 기준은 단위가 다르다(주간/누적/보유). 잠김 문구도 그에 맞춰 안내한다.
export function lockedCopy(reward: UnlockReward) {
  const needed = Math.max(reward.threshold - reward.progress, 0);
  if (reward.unit === 'weekly') {
    return t('rewards.locked.weekly', { threshold: reward.threshold, progress: reward.progress });
  }
  if (reward.unit === 'balance') {
    return t('rewards.locked.balance', { needed });
  }
  return t('rewards.locked.total', { needed });
}

export function Locked({ reward, onPreview }: { reward: UnlockReward; onPreview?: () => void }) {
  return (
    <View className="mx-5 mt-12 items-center rounded-3xl bg-[#F4F1F7] px-7 py-10">
      <Text className="text-3xl">✦</Text>
      <Text className="mt-4 text-xl font-bold text-[#302D35]">{t('rewards.locked.title')}</Text>
      <Text className="mt-2 text-center text-sm leading-6 text-[#77717D]">
        {lockedCopy(reward)}
      </Text>
      <Pressable onPress={() => router.back()} className="mt-7 rounded-2xl bg-[#302D35] px-5 py-3">
        <Text className="text-sm font-bold text-white">{t('rewards.backToBox')}</Text>
      </Pressable>
      {onPreview ? (
        <Pressable
          onPress={onPreview}
          accessibilityRole="button"
          accessibilityLabel={t('rewards.cheer.arrivalPreview')}
          className="mt-4 min-h-11 items-center justify-center px-4">
          <Text className="text-sm font-bold text-[#B25E50]">
            {t('rewards.cheer.arrivalPreview')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function LoadFailed() {
  return (
    <Text className="mx-5 mt-12 text-center text-sm leading-6 text-[#77717D]">
      {t('rewards.loadFailed')}
    </Text>
  );
}
