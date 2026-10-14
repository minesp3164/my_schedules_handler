import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  type NotificationPermission,
} from '@/services/focus-notifications';
import { t } from '@/services/i18n';
import { isValidThemeColor, useTheme, type ThemeColors } from '@/services/theme';
import { ThemeCard } from '@/components/settings/ThemeCard';
import { SettingRow } from '@/components/settings/SettingRow';
import { NotificationSection } from '@/components/settings/NotificationSection';
import { ThemeEditorModal } from '@/components/settings/ThemeEditorModal';
import { normalizeNudgeAt } from '@/components/settings/nudge-time';

const appVersion = Constants.expoConfig?.version ?? '1.0.0';

export default function Settings() {
  const [token, setToken] = useState<string | null>();
  const [nudgeAtDraft, setNudgeAtDraft] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);
  const [timeEditorOpen, setTimeEditorOpen] = useState(false);
  const [themeDraft, setThemeDraft] = useState<ThemeColors>({
    button: '#52786B',
    background: '#F7F7F2',
  });
  const [themeError, setThemeError] = useState<string | null>(null);
  const [paletteField, setPaletteField] = useState<keyof ThemeColors | null>('button');
  const [isAdjustingPalette, setIsAdjustingPalette] = useState(false);
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
  const toggleNudge = () => {
    if (token) update.mutate({ nudge_enabled: !nudgeEnabled });
  };
  const toggleTimeEditor = () => setTimeEditorOpen((open) => !open);
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
  const testNudgeResult = testNudge.isSuccess ? testNudge.data : null;
  const testNudgeError = testNudge.isError ? testNudge.error.message : null;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="px-5 pb-8 pt-8">
        <Text className="text-2xl font-bold text-[#26332D]">{t('settings.title')}</Text>

        <NotificationSection
          token={token}
          hasSettings={Boolean(value)}
          permission={permission}
          onPermissionChange={setPermission}
          nudgeEnabled={nudgeEnabled}
          canManageNudge={canManageNudge}
          saving={update.isPending}
          nudgeAt={nudgeAt}
          timeEditorOpen={timeEditorOpen}
          timeError={timeError}
          testNudgePending={testNudge.isPending}
          testNudgeResult={testNudgeResult}
          testNudgeError={testNudgeError}
          onToggleNudge={toggleNudge}
          onToggleTimeEditor={toggleTimeEditor}
          setNudgeAtDraft={setNudgeAtDraft}
          setTimeError={setTimeError}
          onSaveTime={saveNudgeTime}
          onTestNudge={() => testNudge.mutate()}
        />

        <Text className="mb-2 mt-6 text-[13px] font-bold text-muted">
          {t('settings.sectionAppearance')}
        </Text>
        <View className="overflow-hidden rounded-2xl border border-line bg-surface">
          <ThemeCard colors={colors} onPress={openThemeEditor} />
        </View>

        <Text className="mb-2 mt-6 text-[13px] font-bold text-muted">
          {t('settings.sectionApp')}
        </Text>
        <View className="overflow-hidden rounded-2xl border border-line bg-surface">
          <SettingRow
            label={t('settings.manageTasks')}
            chevron
            onPress={() => {
              if (token) router.push('/tasks');
            }}
          />
        </View>
        {settings.isError ? (
          <Text className="mt-4 text-sm text-[#FF9BA6]">{settings.error.message}</Text>
        ) : null}
        <Text className="mt-6 text-center text-xs text-muted">
          {t('settings.versionLabel', { version: appVersion })}
        </Text>
      </ScrollView>
      <ThemeEditorModal
        visible={themeEditorOpen}
        draft={themeDraft}
        onDraftChange={setThemeDraft}
        paletteField={paletteField}
        onPaletteFieldChange={setPaletteField}
        error={themeError}
        adjusting={isAdjustingPalette}
        onAdjustingChange={setIsAdjustingPalette}
        onClose={() => setThemeEditorOpen(false)}
        onApply={applyTheme}
      />
    </SafeAreaView>
  );
}
