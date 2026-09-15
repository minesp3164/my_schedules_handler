import { Pressable, Text, View } from 'react-native';
import type { TodayRecommendation } from '@/services/today-recommendation';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

type NextActionCardProps = {
  recommendation: TodayRecommendation;
  hasAlternatives: boolean;
  disabled: boolean;
  onAct: () => void;
  onNext: () => void;
  embedded?: boolean;
};

export function NextActionCard({
  recommendation,
  hasAlternatives,
  disabled,
  onAct,
  onNext,
  embedded = false,
}: NextActionCardProps) {
  const { palette } = useTheme();
  const isFocus = recommendation.type === 'focus';
  const title = isFocus ? t('home.nextActionFocusTitle') : recommendation.task.title;
  const description = isFocus
    ? t('home.nextActionFocusDescription')
    : recommendation.completesReward
      ? t('home.nextActionRewardDescription', { points: recommendation.task.points })
      : t('home.nextActionTaskDescription', { points: recommendation.task.points });

  return (
    <View
      className={`${embedded ? '' : 'mx-5 mt-5 '}rounded-[20px] border border-line bg-surface p-5`}>
      <Text className="text-xs font-bold tracking-[1.5px]" style={{ color: palette.accent }}>
        {t('home.nextActionEyebrow')}
      </Text>
      <Text className="mt-2 text-lg font-bold text-[#173052]">{title}</Text>
      <Text className="mt-1 text-sm leading-5 text-muted">{description}</Text>
      <View className="mt-4 flex-row gap-2">
        <Pressable
          disabled={disabled}
          onPress={onAct}
          style={{ backgroundColor: palette.accent }}
          className="min-h-11 flex-1 items-center justify-center rounded-xl px-3 transition duration-150 hover:-translate-y-px hover:opacity-90 disabled:opacity-50">
          <Text className="font-bold text-white">
            {isFocus ? t('home.nextActionStartFocus') : t('home.nextActionCompleteTask')}
          </Text>
        </Pressable>
        {hasAlternatives ? (
          <Pressable
            disabled={disabled}
            onPress={onNext}
            className="min-h-11 items-center justify-center rounded-xl border border-line px-3 transition duration-150 hover:-translate-y-px hover:opacity-90 disabled:opacity-50">
            <Text className="font-bold text-muted">{t('home.nextActionAnother')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
