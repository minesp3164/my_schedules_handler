import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import { META, RING } from './board';

// 오늘의 목표: 완료 상태를 담은 배지
export function HomeGoalsCard({
  doneCount,
  totalGoal,
  completionRate,
}: {
  doneCount: number;
  totalGoal: number;
  completionRate: number;
}) {
  const { palette } = useTheme();
  return (
    <View className="mx-5 mt-6 rounded-3xl border border-hairline bg-white px-5 py-5">
      <View className="flex-row items-center">
        <View
          className="h-[46px] w-[46px] items-center justify-center rounded-full border-2"
          style={{
            borderColor: doneCount > 0 ? palette.accent : RING,
            backgroundColor: doneCount > 0 ? palette.accent : '#FFFFFF',
          }}>
          {totalGoal > 0 && doneCount === totalGoal ? (
            <Ionicons name="checkmark" size={22} color="#FFFFFF" />
          ) : (
            <Text
              className="text-[16px] font-bold"
              style={{ color: doneCount > 0 ? '#FFFFFF' : META }}>
              {doneCount}
            </Text>
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[11px] font-bold tracking-[1.5px] text-meta">
            {t('home.goalsEyebrow')}
          </Text>
          <Text className="mt-1 text-[15px] font-semibold text-ink">
            {t('home.goalsTotal', { count: totalGoal })}
          </Text>
        </View>
        <Text className="text-[26px] font-bold leading-8 text-ink">{completionRate}%</Text>
      </View>

      {totalGoal === 0 ? (
        <Text className="mt-4 text-[13px] leading-5 text-meta">{t('home.configureGoalsHint')}</Text>
      ) : null}
    </View>
  );
}
