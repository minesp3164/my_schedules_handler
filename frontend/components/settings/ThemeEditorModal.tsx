import { type Dispatch, type SetStateAction, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { t } from '@/services/i18n';
import { isValidThemeColor, useTheme, type ThemeColors } from '@/services/theme';
import { ColorWheel } from '@/components/ColorWheel';

const buttonColorPresets = [
  '#52786B',
  '#4F46E5',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#EA580C',
  '#D97706',
  '#16A34A',
  '#0F766E',
  '#475569',
];
const backgroundColorPresets = [
  '#F7F7F2',
  '#F8F5FF',
  '#FFF7F1',
  '#F1FBF6',
  '#FFFBEA',
  '#F7F7F8',
  '#F2F6FC',
  '#FFF1F5',
];

function darkenColor(value: string, amount: number) {
  if (!isValidThemeColor(value)) return value;

  const channels = [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
  return `#${channels
    .map((channel) =>
      Math.round(channel * (1 - amount))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

// 테마 색(버튼/배경) 편집기. 적용 직전 미리 보기를 함께 보여준다.
export function ThemeEditorModal({
  visible,
  draft,
  onDraftChange,
  paletteField,
  onPaletteFieldChange,
  error,
  adjusting,
  onAdjustingChange,
  onClose,
  onApply,
}: {
  visible: boolean;
  draft: ThemeColors;
  onDraftChange: Dispatch<SetStateAction<ThemeColors>>;
  paletteField: keyof ThemeColors | null;
  onPaletteFieldChange: Dispatch<SetStateAction<keyof ThemeColors | null>>;
  error: string | null;
  adjusting: boolean;
  onAdjustingChange: Dispatch<SetStateAction<boolean>>;
  onClose: () => void;
  onApply: () => void;
}) {
  const { palette } = useTheme();
  const [applyPressed, setApplyPressed] = useState(false);
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <ScrollView
          scrollEnabled={!adjusting}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: '88%' }}
          contentContainerClassName="rounded-t-[28px] bg-white px-5 pb-8 pt-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-[#26332D]">
              {t('settings.themeModalTitle')}
            </Text>
            <Pressable onPress={onClose} accessibilityLabel={t('settings.themeCancel')}>
              <Text className="text-sm font-semibold text-muted">{t('settings.themeCancel')}</Text>
            </Pressable>
          </View>
          {(['button', 'background'] as const).map((field) => (
            <View key={field} className="mt-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-[#26332D]">
                  {field === 'button'
                    ? t('settings.themeButtonColor')
                    : t('settings.themeBackgroundColor')}
                </Text>
              </View>
              <View className="mt-2 flex-row items-center">
                <View
                  className="h-11 w-11 rounded-xl border"
                  style={{ backgroundColor: draft[field], borderColor: palette.line }}
                />
                <TextInput
                  value={draft[field]}
                  onChangeText={(value) =>
                    onDraftChange((current) => ({ ...current, [field]: value }))
                  }
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={7}
                  placeholder="#52786B"
                  placeholderTextColor="#829BB7"
                  className="ml-3 flex-1 rounded-xl border border-line bg-screen px-3 py-3 font-semibold text-[#26332D]"
                />
              </View>
              <View className="mt-3 flex-row flex-wrap items-center gap-2">
                {(field === 'button' ? buttonColorPresets : backgroundColorPresets).map((color) => (
                  <Pressable
                    key={color}
                    accessibilityRole="button"
                    accessibilityLabel={color}
                    onPress={() => onDraftChange((current) => ({ ...current, [field]: color }))}
                    className="h-8 w-8 rounded-full border-2 border-white"
                    style={{ backgroundColor: color }}
                  />
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.themePalette')}
                  onPress={() =>
                    onPaletteFieldChange((current) => (current === field ? null : field))
                  }
                  accessibilityState={{ selected: paletteField === field }}
                  className="h-8 w-9 items-center justify-center">
                  <Svg width={36} height={32} viewBox="0 0 36 32">
                    <Path
                      d="M18 2.5C9.8 2.5 3.2 7.8 3.2 15.2c0 7.5 6 13.3 13.5 13.3h2.7c1.8 0 2.9-1.8 2-3.3-.5-.8-.1-1.8.9-1.8H25c4.3 0 7.8-3.6 7.8-8.1C32.8 8 26.2 2.5 18 2.5Z"
                      fill="#FFFDF8"
                      stroke={palette.accent}
                      strokeWidth={paletteField === field ? 2.5 : 1.4}
                    />
                    <Circle cx="11" cy="11.5" r="2.6" fill="#EF4444" />
                    <Circle cx="17.5" cy="8.8" r="2.6" fill="#F59E0B" />
                    <Circle cx="24" cy="12" r="2.6" fill="#22C55E" />
                    <Circle cx="10.8" cy="18.2" r="2.6" fill="#3B82F6" />
                    <Circle cx="17.5" cy="18.8" r="2.6" fill="#8B5CF6" />
                  </Svg>
                </Pressable>
              </View>
              {paletteField === field ? (
                <View className="mt-4 items-center rounded-2xl border border-line bg-screen py-4">
                  <ColorWheel
                    value={draft[field]}
                    accessibilityLabel={t('settings.themePalette')}
                    brightnessLabel={t('settings.themeBrightness')}
                    onInteractionChange={onAdjustingChange}
                    onChange={(color) =>
                      onDraftChange((current) => ({ ...current, [field]: color }))
                    }
                  />
                  <Text className="mt-3 px-4 text-center text-xs text-muted">
                    {t('settings.themePaletteHint')}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
          <View className="mt-6 rounded-2xl p-4" style={{ backgroundColor: draft.background }}>
            <Text className="text-sm font-bold text-[#26332D]">{t('settings.themePreview')}</Text>
            <View
              className="mt-3 items-center rounded-xl py-3"
              style={{ backgroundColor: draft.button }}>
              <Text className="font-bold text-white">{t('settings.themeApply')}</Text>
            </View>
          </View>
          {error ? <Text className="mt-3 text-sm text-[#FF5573]">{error}</Text> : null}
          <Pressable
            onPress={onApply}
            onPressIn={() => setApplyPressed(true)}
            onPressOut={() => setApplyPressed(false)}
            className="mt-5 items-center rounded-xl py-4"
            style={{ backgroundColor: darkenColor(draft.button, applyPressed ? 0.14 : 0) }}>
            <Text className="font-bold text-white">{t('settings.themeApply')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
