import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import { formatWeekRange } from '@/services/week-stats';

// 상단 바: 이전/다음 주 이동과 제목.
export function RetroHeader({
  isCurrentWeek,
  weekStart,
  onPrevWeek,
  onNextWeek,
}: {
  isCurrentWeek: boolean;
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}) {
  const { palette } = useTheme();
  return (
    <View className="mt-3 flex-row items-center justify-between px-5">
      <Pressable
        onPress={() => router.back()}
        accessibilityLabel={t('common.goHome')}
        className="h-10 w-10 items-center justify-center rounded-xl bg-white">
        <Text className="text-xl text-muted">‹</Text>
      </Pressable>
      <Text className="text-base font-bold" style={{ color: palette.accentDeep }}>
        {isCurrentWeek
          ? t('retro.title')
          : t('retro.pastTitle', { week: formatWeekRange(weekStart) })}
      </Text>
      <View className="flex-row items-center gap-1">
        <Pressable
          onPress={onPrevWeek}
          accessibilityLabel={t('retro.prevWeek')}
          className="h-10 w-8 items-center justify-center">
          <Text className="text-lg text-muted">‹</Text>
        </Pressable>
        <Pressable
          onPress={onNextWeek}
          disabled={isCurrentWeek}
          accessibilityLabel={t('retro.nextWeek')}
          className="h-10 w-8 items-center justify-center"
          style={{ opacity: isCurrentWeek ? 0.25 : 1 }}>
          <Text className="text-lg text-muted">›</Text>
        </Pressable>
      </View>
    </View>
  );
}
