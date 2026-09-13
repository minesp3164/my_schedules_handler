import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from '@/services/focus-notifications';
import { t } from '@/services/i18n';
import { isValidThemeColor, useTheme, type ThemeColors } from '@/services/theme';
import { ColorWheel } from '@/components/ColorWheel';

const colorPresets = ['#2479CC', '#7C5ACD', '#D25575', '#188B72', '#E38A2D'];

export default function Settings() {
  const [token, setToken] = useState<string | null>();
  const [nudgeAtDraft, setNudgeAtDraft] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);
  const [themeDraft, setThemeDraft] = useState<ThemeColors>({
    button: '#2479CC',
    background: '#F5FAFF',
  });
  const [themeError, setThemeError] = useState<string | null>(null);
  const [paletteField, setPaletteField] = useState<keyof ThemeColors | null>('button');
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
    mutationFn: (input: { nudge_enabled?: boolean; nudge_at?: string }) =>
      updateSettings(token!, input),
    onSuccess: () => {
      setNudgeAtDraft(null);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
  const value = settings.data;
  const nudgeAt = nudgeAtDraft ?? value?.nudge_at ?? '13:00';
  const saveNudgeTime = () => {
    if (!token) return;
    if (!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(nudgeAt)) {
      setTimeError(t('settings.invalidTime'));
      return;
    }
    setTimeError(null);
    update.mutate({ nudge_at: nudgeAt });
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
        <Text className="text-2xl font-bold text-[#173052]">{t('settings.title')}</Text>
        <Text className="mt-2 text-sm text-muted">{t('settings.description')}</Text>
        <View
          className="mt-6 rounded-2xl p-4"
          style={{ backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1 }}>
          <Text className="font-bold text-[#173052]">{t('settings.theme')}</Text>
          <Text className="mt-1 text-sm text-muted">{t('settings.themeDescription')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.themeCustomize')}
            onPress={openThemeEditor}
            className="mt-4 flex-row items-center justify-between rounded-xl px-3 py-3"
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
        <View className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <Text className="font-bold text-[#173052]">{t('settings.focusTime')}</Text>
          <Text className="mt-2 text-sm text-muted">
            {t('settings.focusTimeValue', {
              focus: value?.focus_minutes ?? 25,
              break: value?.break_minutes ?? 5,
            })}
          </Text>
        </View>
        <View className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="font-bold text-[#173052]">{t('settings.nudge')}</Text>
              <Text className="mt-1 text-sm text-muted">
                {t('settings.nudgeDescription', { time: value?.nudge_at ?? '13:00' })}
              </Text>
            </View>
            <Switch
              value={value?.nudge_enabled ?? true}
              disabled={update.isPending}
              onValueChange={(next) => {
                if (token) update.mutate({ nudge_enabled: next });
              }}
              trackColor={{ false: palette.line, true: palette.accent }}
            />
          </View>
        </View>
        <View className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <Text className="font-bold text-[#173052]">{t('settings.nudgeTime')}</Text>
          <Text className="mt-1 text-sm text-muted">{t('settings.nudgeTimeHint')}</Text>
          <View className="mt-3 flex-row gap-2">
            <TextInput
              value={nudgeAt}
              onChangeText={(next) => setNudgeAtDraft(next)}
              editable={Boolean(value) && !update.isPending}
              inputMode="numeric"
              maxLength={5}
              placeholder="13:00"
              placeholderTextColor="#829BB7"
              className="flex-1 rounded-xl border border-line bg-screen px-3 py-3 font-semibold text-[#173052]"
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
          {timeError ? <Text className="mt-2 text-xs text-[#FF9BA6]">{timeError}</Text> : null}
        </View>
        <View className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <Text className="font-bold text-[#173052]">{t('settings.notificationPermission')}</Text>
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
          className="mt-4 rounded-2xl border border-line bg-surface p-4 transition duration-150 hover:-translate-y-px hover:bg-[#EAF4FF]">
          <Text className="font-bold text-[#173052]">{t('settings.manageTasks')}</Text>
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
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: '88%' }}
            contentContainerClassName="rounded-t-[28px] bg-white px-5 pb-8 pt-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-[#173052]">
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
                  <Text className="text-sm font-bold text-[#173052]">
                    {field === 'button'
                      ? t('settings.themeButtonColor')
                      : t('settings.themeBackgroundColor')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.themePalette')}
                    onPress={() => setPaletteField((current) => (current === field ? null : field))}
                    className="rounded-full px-3 py-1"
                    style={{ backgroundColor: palette.accentSoft }}>
                    <Text className="text-xs font-bold" style={{ color: palette.accent }}>
                      {t('settings.themePalette')}
                    </Text>
                  </Pressable>
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
                    placeholder="#2479CC"
                    placeholderTextColor="#829BB7"
                    className="ml-3 flex-1 rounded-xl border border-line bg-screen px-3 py-3 font-semibold text-[#173052]"
                  />
                </View>
                <View className="mt-3 flex-row gap-2">
                  {colorPresets.map((color) => (
                    <Pressable
                      key={color}
                      accessibilityRole="button"
                      accessibilityLabel={color}
                      onPress={() => setThemeDraft((current) => ({ ...current, [field]: color }))}
                      className="h-8 w-8 rounded-full border-2 border-white"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </View>
                {paletteField === field ? (
                  <View className="mt-4 items-center rounded-2xl border border-line bg-screen py-4">
                    <ColorWheel
                      value={themeDraft[field]}
                      accessibilityLabel={t('settings.themePalette')}
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
              <Text className="text-sm font-bold text-[#173052]">{t('settings.themePreview')}</Text>
              <View
                className="mt-3 items-center rounded-xl py-3"
                style={{ backgroundColor: themeDraft.button }}>
                <Text className="font-bold text-white">{t('settings.themeApply')}</Text>
              </View>
            </View>
            {themeError ? <Text className="mt-3 text-sm text-[#FF5573]">{themeError}</Text> : null}
            <Pressable
              onPress={applyTheme}
              className="mt-5 items-center rounded-xl py-4"
              style={{ backgroundColor: themeDraft.button }}>
              <Text className="font-bold text-white">{t('settings.themeApply')}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
