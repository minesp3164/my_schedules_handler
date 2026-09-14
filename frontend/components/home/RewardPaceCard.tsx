import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

export function RewardPaceCard({
  points,
  remaining,
  focusMinutes,
}: {
  points: number;
  remaining: number;
  focusMinutes: number;
}) {
  const { palette } = useTheme();
  return (
    <View className="mx-5 mt-6 rounded-[20px] p-5" style={{ backgroundColor: palette.accentDeep }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[17px] font-bold text-white">{t('home.paceTitle')}</Text>
          <Text className="mt-1 text-sm leading-5" style={{ color: palette.accentSoft }}>
            {remaining > 0
              ? t('home.remaining', { points: t('common.point', { count: remaining }) })
              : t('home.rewardComplete')}
          </Text>
        </View>
        <Text className="text-2xl font-bold" style={{ color: palette.accentSoft }}>
          {t('common.point', { count: points })}
        </Text>
      </View>
      <Pressable
        onPress={() => router.push('/focus')}
        style={{ backgroundColor: palette.accent }}
        className="mt-5 items-center rounded-xl bg-[#79CEFF] px-4 py-3.5">
        <Text className="font-bold text-[#173052]">
          {t('home.startFocus', { minutes: focusMinutes })}
        </Text>
      </Pressable>
    </View>
  );
}
