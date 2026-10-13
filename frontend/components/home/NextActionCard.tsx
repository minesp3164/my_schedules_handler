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

  // 부모 카드 안에 들어갈 때는 테두리를 겹치지 않게 뺀다(카드 안의 카드 방지).
  return (
    <View
      className={embedded ? 'mt-4' : 'mx-5 mt-5 rounded-3xl border border-hairline bg-white p-5'}>
      <Text className="text-[11px] font-bold tracking-[1.5px] text-meta">
        {t('home.nextActionEyebrow')}
      </Text>
      <Text className="mt-2 text-[17px] font-bold leading-6 text-ink">{title}</Text>
      <Text className="mt-1 text-[13px] leading-5 text-meta">{description}</Text>
      <View className="mt-4 flex-row gap-2">
        <Pressable
          disabled={disabled}
          onPress={onAct}
          style={{ backgroundColor: palette.accent }}
          className="min-h-11 flex-1 items-center justify-center rounded-2xl px-3 transition duration-150 hover:opacity-90 disabled:opacity-50">
          <Text className="font-bold text-white">
            {isFocus ? t('home.nextActionStartFocus') : t('home.nextActionCompleteTask')}
          </Text>
        </Pressable>
        {hasAlternatives ? (
          <Pressable
            disabled={disabled}
            onPress={onNext}
            className="min-h-11 items-center justify-center rounded-2xl border border-hairline px-4 transition duration-150 hover:opacity-90 disabled:opacity-50">
            <Text className="font-bold text-meta">{t('home.nextActionAnother')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
