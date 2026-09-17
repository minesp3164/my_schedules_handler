import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  getSettings,
  sendTestNudge,
  updateSettings,
  type Settings as AppSettings,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import {
  getNotificationPermission,
  previewNudgeNotification,
  requestNotificationPermission,
  type NotificationPermission,
} from '@/services/focus-notifications';
import { t } from '@/services/i18n';
import { isValidThemeColor, useTheme, type ThemeColors } from '@/services/theme';
import { ColorWheel } from '@/components/ColorWheel';
import { ThemeCard } from '@/components/settings/ThemeCard';

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

function formatNudgeTimeInput(next: string) {
  const digits = next.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;

  const splitAt = Number(digits.slice(0, 2)) <= 23 ? 2 : 1;
  return `${digits.slice(0, splitAt)}:${digits.slice(splitAt, splitAt + 2)}`;
}

function normalizeNudgeAt(raw: string) {
  const trimmed = raw.trim();
  if (/^\d{1,2}$/.test(trimmed)) return `${trimmed.padStart(2, '0')}:00`;
  if (!trimmed.includes(':')) return trimmed;

  const [hours, minutes = ''] = trimmed.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padEnd(2, '0')}`;
}

export default function Settings() {
  const [token, setToken] = useState<string | null>();
  const [nudgeAtDraft, setNudgeAtDraft] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);
  const [themeDraft, setThemeDraft] = useState<ThemeColors>({
    button: '#52786B',
    background: '#F7F7F2',
  });
  const [themeError, setThemeError] = useState<string | null>(null);
  const [paletteField, setPaletteField] = useState<keyof ThemeColors | null>('button');
  const [applyInteraction, setApplyInteraction] = useState<'idle' | 'hovered' | 'pressed'>('idle');
  const [isAdjustingPalette, setIsAdjustingPalette] = useState(false);
  const [nudgeKnobOffset] = useState(() => new Animated.Value(0));
  const queryClient = useQueryClient();
  const { colors, palette, setColors } = useTheme();
  useEffect(() => {
    getDeviceToken().then(setToken);
    getNotificationPermission().then(setPermission);
  }, []);
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings(token!),
    enabled: Boolean(token),
  });
  const update = useMutation({
    mutationFn: (input: Partial<AppSettings>) => updateSettings(token!, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] });
      const previous = queryClient.getQueryData<AppSettings>(['settings']);
      if (previous) queryClient.setQueryData<AppSettings>(['settings'], { ...previous, ...input });
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(['settings'], context.previous);
    },
    onSuccess: () => {
      setNudgeAtDraft(null);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
  const testNudge = useMutation({
    mutationFn: async () => {
      try {
        await sendTestNudge(token!);
        return 'sent' as const;
      } catch (error) {
        if ((error as { code?: string }).code === 'no_push_channel') {
          const shown = await previewNudgeNotification();
          if (shown) return 'preview' as const;
        }
        throw error;
      }
    },
  });
  const value = settings.data;
  const nudgeAt = nudgeAtDraft ?? value?.nudge_at ?? '13:00';
  const nudgeEnabled = value?.nudge_enabled ?? true;
  const canManageNudge = permission === 'granted';
  useEffect(() => {
    Animated.timing(nudgeKnobOffset, {
      toValue: nudgeEnabled ? 22 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [nudgeEnabled, nudgeKnobOffset]);
  const saveNudgeTime = () => {
    if (!token) return;
    const normalized = normalizeNudgeAt(nudgeAt);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
      setTimeError(t('settings.invalidTime'));
      return;
    }
    setTimeError(null);
    setNudgeAtDraft(normalized);
    update.mutate({ nudge_at: normalized });
  };
  const openThemeEditor = () => {
    setThemeDraft(colors);
    setThemeError(null);
    setPaletteField('button');
    setThemeEditorOpen(true);
  };
  const applyTheme = () => {
    if (!isValidThemeColor(themeDraft.button) || !isValidThemeColor(themeDraft.background)) {
      setThemeError(t('settings.invalidThemeColor'));
      return;
    }
    setColors({
      button: themeDraft.button.toUpperCase(),
      background: themeDraft.background.toUpperCase(),
    });
    setThemeEditorOpen(false);
  };
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="px-5 pb-8 pt-8">
        <Text className="text-2xl font-bold text-[#26332D]">{t('settings.title')}</Text>
        <Text className="mt-2 text-sm text-muted">{t('settings.description')}</Text>
        <ThemeCard colors={colors} onPress={openThemeEditor} />
        <View className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="font-bold text-[#26332D]">{t('settings.nudge')}</Text>
              <Text className="mt-1 text-sm text-muted">
                {canManageNudge
                  ? t('settings.nudgeDescription', { time: value?.nudge_at ?? '13:00' })
                  : t('settings.nudgePermissionRequired')}
              </Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel={t('settings.nudge')}
              accessibilityState={{ checked: nudgeEnabled }}
              disabled={update.isPending || !canManageNudge}
              onPress={() => {
                if (token) update.mutate({ nudge_enabled: !nudgeEnabled });
              }}
              className="justify-center rounded-full p-1 disabled:opacity-50"
              style={{
                width: 52,
                height: 30,
                backgroundColor:
                  nudgeEnabled && canManageNudge ? palette.accentSoft : palette.screen,
                borderWidth: 1,
                borderColor: nudgeEnabled && canManageNudge ? palette.accent : palette.line,
              }}>
              <Animated.View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: nudgeEnabled && canManageNudge ? colors.button : palette.line,
                  transform: [{ translateX: nudgeKnobOffset }],
                }}
              />
            </Pressable>
          </View>
        </View>
        <View className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <Text className="font-bold text-[#26332D]">{t('settings.nudgeTime')}</Text>
          <Text className="mt-1 text-sm text-muted">{t('settings.nudgeTimeHint')}</Text>
          <View className="mt-3 flex-row gap-2">
            <TextInput
              value={nudgeAt}
              onFocus={() => setNudgeAtDraft('')}
              onBlur={() => setNudgeAtDraft((current) => (current === '' ? null : current))}
              onChangeText={(next) => {
                setNudgeAtDraft(formatNudgeTimeInput(next));
                setTimeError(null);
              }}
              editable={Boolean(value) && !update.isPending}
              inputMode="numeric"
              maxLength={5}
              placeholder="13:00"
              placeholderTextColor="#829BB7"
              className="flex-1 rounded-xl border border-line bg-screen px-3 py-3 font-semibold text-[#26332D]"
            />
            <Pressable
              disabled={update.isPending}
              onPress={saveNudgeTime}
              style={{ backgroundColor: palette.accent }}
              className="items-center justify-center rounded-xl bg-lavender px-4 transition duration-150 hover:-translate-y-px hover:opacity-90 disabled:opacity-50">
              <Text className="font-bold text-white">{t('settings.saveTime')}</Text>
            </Pressable>
          </View>
          <View className="mt-3 flex-row gap-2">
            {['12:00', '13:00', '14:00'].map((time) => (
              <Pressable
                key={time}
                disabled={update.isPending}
                onPress={() => {
                  if (token) {
                    setNudgeAtDraft(time);
                    setTimeError(null);
                  }
                }}
                style={nudgeAt === time ? { backgroundColor: palette.accent } : undefined}
                className={`rounded-lg px-3 py-2 transition duration-150 hover:-translate-y-px hover:opacity-90 ${nudgeAt === time ? 'bg-lavender' : 'bg-screen'}`}>
                <Text className={`font-semibold ${nudgeAt === time ? 'text-white' : 'text-muted'}`}>
                  {time}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            disabled={!token || testNudge.isPending}
            onPress={() => testNudge.mutate()}
            className="mt-3 items-center rounded-xl border border-line bg-screen py-3 transition duration-150 hover:-translate-y-px hover:opacity-90 disabled:opacity-50">
            <Text className="font-semibold text-muted">
              {testNudge.isPending ? t('settings.nudgeTestSending') : t('settings.nudgeTest')}
            </Text>
          </Pressable>
          {testNudge.isSuccess ? (
            <Text className="mt-2 text-xs" style={{ color: palette.accent }}>
              {testNudge.data === 'preview'
                ? t('settings.nudgeTestPreviewed')
                : t('settings.nudgeTestSent')}
            </Text>
          ) : null}
          {testNudge.isError ? (
            <Text className="mt-2 text-xs text-[#FF9BA6]">{testNudge.error.message}</Text>
          ) : null}
          {timeError ? <Text className="mt-2 text-xs text-[#FF9BA6]">{timeError}</Text> : null}
        </View>
        <View className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <Text className="font-bold text-[#26332D]">{t('settings.notificationPermission')}</Text>
          <Text className="mt-1 text-sm text-muted">
            {t(`settings.permission${permission.charAt(0).toUpperCase()}${permission.slice(1)}`)}
          </Text>
          {permission === 'undetermined' ? (
            <Pressable
              onPress={async () => setPermission(await requestNotificationPermission())}
              style={{ backgroundColor: palette.accent }}
              className="mt-3 self-start rounded-xl bg-lavender px-4 py-3 transition duration-150 hover:-translate-y-px hover:opacity-90">
              <Text className="font-bold text-white">{t('settings.allowNotifications')}</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => {
            if (token) router.push('/tasks');
          }}
          className="mt-4 rounded-2xl border border-line bg-surface p-4 transition duration-150 hover:-translate-y-px">
          <Text className="font-bold text-[#26332D]">{t('settings.manageTasks')}</Text>
          <Text className="mt-1 text-sm text-muted">{t('settings.manageTasksDescription')}</Text>
        </Pressable>
        {settings.isError ? (
          <Text className="mt-4 text-sm text-[#FF9BA6]">{settings.error.message}</Text>
        ) : null}
      </ScrollView>
      <Modal
        transparent
        animationType="slide"
        visible={themeEditorOpen}
        onRequestClose={() => setThemeEditorOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <ScrollView
            scrollEnabled={!isAdjustingPalette}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: '88%' }}
            contentContainerClassName="rounded-t-[28px] bg-white px-5 pb-8 pt-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-[#26332D]">
                {t('settings.themeModalTitle')}
              </Text>
              <Pressable
                onPress={() => setThemeEditorOpen(false)}
                accessibilityLabel={t('settings.themeCancel')}>
                <Text className="text-sm font-semibold text-muted">
                  {t('settings.themeCancel')}
                </Text>
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
                    style={{ backgroundColor: themeDraft[field], borderColor: palette.line }}
                  />
                  <TextInput
                    value={themeDraft[field]}
                    onChangeText={(value) =>
                      setThemeDraft((current) => ({ ...current, [field]: value }))
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
                  {(field === 'button' ? buttonColorPresets : backgroundColorPresets).map(
                    (color) => (
                      <Pressable
                        key={color}
                        accessibilityRole="button"
                        accessibilityLabel={color}
                        onPress={() => setThemeDraft((current) => ({ ...current, [field]: color }))}
                        className="h-8 w-8 rounded-full border-2 border-white"
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.themePalette')}
                    onPress={() => setPaletteField((current) => (current === field ? null : field))}
                    accessibilityState={{ selected: paletteField === field }}
                    className="h-8 w-9 items-center justify-center transition duration-150 hover:-translate-y-px hover:opacity-90">
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
                      value={themeDraft[field]}
                      accessibilityLabel={t('settings.themePalette')}
                      brightnessLabel={t('settings.themeBrightness')}
                      onInteractionChange={setIsAdjustingPalette}
                      onChange={(color) =>
                        setThemeDraft((current) => ({ ...current, [field]: color }))
                      }
                    />
                    <Text className="mt-3 px-4 text-center text-xs text-muted">
                      {t('settings.themePaletteHint')}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
            <View
              className="mt-6 rounded-2xl p-4"
              style={{ backgroundColor: themeDraft.background }}>
              <Text className="text-sm font-bold text-[#26332D]">{t('settings.themePreview')}</Text>
              <View
                className="mt-3 items-center rounded-xl py-3"
                style={{ backgroundColor: themeDraft.button }}>
                <Text className="font-bold text-white">{t('settings.themeApply')}</Text>
              </View>
            </View>
            {themeError ? <Text className="mt-3 text-sm text-[#FF5573]">{themeError}</Text> : null}
            <Pressable
              onPress={applyTheme}
              onHoverIn={() => setApplyInteraction('hovered')}
              onHoverOut={() => setApplyInteraction('idle')}
              onPressIn={() => setApplyInteraction('pressed')}
              onPressOut={() => setApplyInteraction('idle')}
              className="mt-5 items-center rounded-xl py-4 transition duration-150"
              style={{
                backgroundColor: darkenColor(
                  themeDraft.button,
                  applyInteraction === 'pressed' ? 0.16 : applyInteraction === 'hovered' ? 0.08 : 0
                ),
                transform: [{ scale: applyInteraction === 'pressed' ? 0.98 : 1 }],
              }}>
              <Text className="font-bold text-white">{t('settings.themeApply')}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
