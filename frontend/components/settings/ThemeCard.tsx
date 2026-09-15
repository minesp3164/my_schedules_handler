import { Pressable, Text, View } from 'react-native';
import { t } from '@/services/i18n';
import { useTheme, type ThemeColors } from '@/services/theme';

export function ThemeCard({ colors, onPress }: { colors: ThemeColors; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <View
      className="mt-6 rounded-2xl p-4"
      style={{ backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1 }}>
      <Text className="font-bold text-[#173052]">{t('settings.theme')}</Text>
      <Text className="mt-1 text-sm text-muted">{t('settings.themeDescription')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings.themeCustomize')}
        onPress={onPress}
        className="mt-4 flex-row items-center justify-between rounded-xl px-3 py-3 transition duration-150 hover:-translate-y-px hover:opacity-90"
        style={{ backgroundColor: palette.accentSoft }}>
        <View className="flex-row items-center">
          <View className="h-8 w-8 rounded-full" style={{ backgroundColor: colors.button }} />
          <View
            className="ml-2 h-8 w-8 rounded-full border"
            style={{ backgroundColor: colors.background, borderColor: palette.line }}
          />
          <Text className="ml-3 text-sm font-bold text-[#173052]">
            {t('settings.themeCustomize')}
          </Text>
        </View>
        <Text className="text-lg text-[#173052]">›</Text>
      </Pressable>
    </View>
  );
}
