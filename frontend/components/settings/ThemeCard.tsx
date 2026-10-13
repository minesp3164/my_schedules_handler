import { Pressable, Text, View } from 'react-native';
import { t } from '@/services/i18n';
import { useTheme, type ThemeColors } from '@/services/theme';

export function ThemeCard({ colors, onPress }: { colors: ThemeColors; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('settings.themeCustomize')}
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-4">
      <Text className="text-[15px] font-semibold text-[#26332D]">{t('settings.theme')}</Text>
      <View className="flex-row items-center gap-2">
        <View className="h-5 w-5 rounded-full" style={{ backgroundColor: colors.button }} />
        <View
          className="h-5 w-5 rounded-full border"
          style={{ backgroundColor: colors.background, borderColor: palette.line }}
        />
        <Text className="text-lg text-muted">›</Text>
      </View>
    </Pressable>
  );
}
