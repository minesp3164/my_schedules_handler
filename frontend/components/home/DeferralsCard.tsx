import { Pressable, Text, View } from 'react-native';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import type { TaskDeferral } from '@/services/api';

// 내일로 보낸 할 일
export function DeferralsCard({
  deferrals,
  undoPending,
  undoError,
  onUndo,
}: {
  deferrals: TaskDeferral[];
  undoPending: boolean;
  undoError: string | null;
  onUndo: (deferralId: string) => void;
}) {
  const { palette } = useTheme();
  if (!deferrals.length) return null;
  return (
    <View className="mx-5 mt-4 rounded-3xl border border-hairline bg-white px-5 py-4">
      <Text className="text-[15px] font-bold text-ink">{t('home.deferrals.title')}</Text>
      <Text className="mt-1 text-[13px] leading-5 text-meta">
        {t('home.deferrals.description')}
      </Text>
      {deferrals.map((item) => (
        <View key={item.deferral_id}>
          <View className="mt-3 h-px bg-hairline" />
          <View className="flex-row items-center justify-between pt-3">
            <View className="flex-1 pr-3">
              <Text className="text-[15px] font-semibold leading-5 text-ink" numberOfLines={1}>
                {item.title}
              </Text>
              <Text className="mt-0.5 text-xs text-meta">
                {t('home.deferrals.meetAgain', {
                  month: Number(item.to_date.slice(5, 7)),
                  day: Number(item.to_date.slice(8)),
                })}
              </Text>
            </View>
            <Pressable
              disabled={undoPending}
              onPress={() => onUndo(item.deferral_id)}
              accessibilityRole="button"
              accessibilityLabel={t('home.deferrals.undoAccessibility', {
                title: item.title,
              })}
              className="min-h-9 items-center justify-center rounded-full border border-hairline px-3.5">
              <Text className="text-xs font-bold" style={{ color: palette.accent }}>
                {t('home.deferrals.undo')}
              </Text>
            </Pressable>
          </View>
        </View>
      ))}
      {undoError ? <Text className="mt-2 text-[11px] text-[#C44B5D]">{undoError}</Text> : null}
    </View>
  );
}
