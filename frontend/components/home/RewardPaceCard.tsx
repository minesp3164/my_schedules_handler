import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

export function RewardPaceCard({ points, remaining }: { points: number; remaining: number }) {
  const { palette } = useTheme();
  const total = points + remaining;
  const percent = total > 0 ? Math.min(100, Math.round((points / total) * 100)) : 0;

  return (
    <View className="mx-5 mt-5 rounded-3xl border border-hairline bg-white p-5">
      <View className="flex-row items-end justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[11px] font-bold tracking-[1.5px] text-meta">
            {t('home.reward')}
          </Text>
          <Text className="mt-1.5 text-[17px] font-bold text-ink">{t('home.paceTitle')}</Text>
        </View>
        <Text className="text-[26px] font-bold leading-8 text-ink">
          {t('common.point', { count: points })}
        </Text>
      </View>

      <Text className="mt-1 text-[13px] leading-5 text-meta">
        {remaining > 0
          ? t('home.remaining', { points: t('common.point', { count: remaining }) })
          : t('home.rewardComplete')}
      </Text>

      <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#EEF0F2]">
        <View
          style={{ width: `${percent}%`, backgroundColor: palette.accent }}
          className="h-full rounded-full"
        />
      </View>
      <Text className="mt-2 text-[11px] font-bold tracking-[1px] text-meta">{`${percent}%`}</Text>

      <Pressable
        onPress={() => router.push('/focus')}
        accessibilityRole="button"
        accessibilityLabel={t('home.openFocusTimer')}
        style={{ backgroundColor: palette.accent }}
        className="mt-5 min-h-12 items-center justify-center rounded-2xl px-4 transition duration-150 hover:opacity-90">
        <Text className="font-bold text-white">{t('home.openFocusTimer')}</Text>
      </Pressable>
    </View>
  );
}
