import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { Animated, Pressable, Text, TextInput, View } from 'react-native';
import {
  requestNotificationPermission,
  type NotificationPermission,
} from '@/services/focus-notifications';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import { RowDivider, SettingRow } from './SettingRow';
import { formatNudgeTimeInput } from './nudge-time';

export type NotificationSectionProps = {
  token: string | null | undefined;
  hasSettings: boolean;
  permission: NotificationPermission;
  onPermissionChange: (permission: NotificationPermission) => void;
  nudgeEnabled: boolean;
  canManageNudge: boolean;
  saving: boolean;
  nudgeAt: string;
  timeEditorOpen: boolean;
  timeError: string | null;
  testNudgePending: boolean;
  testNudgeResult: 'sent' | 'preview' | null;
  testNudgeError: string | null;
  onToggleNudge: () => void;
  onToggleTimeEditor: () => void;
  setNudgeAtDraft: Dispatch<SetStateAction<string | null>>;
  setTimeError: Dispatch<SetStateAction<string | null>>;
  onSaveTime: () => void;
  onTestNudge: () => void;
};

// 알림 섹션: 알림 받기 토글 · 알림 시각 · 테스트 발송 · 권한 상태.
export function NotificationSection({
  token,
  hasSettings,
  permission,
  onPermissionChange,
  nudgeEnabled,
  canManageNudge,
  saving,
  nudgeAt,
  timeEditorOpen,
  timeError,
  testNudgePending,
  testNudgeResult,
  testNudgeError,
  onToggleNudge,
  onToggleTimeEditor,
  setNudgeAtDraft,
  setTimeError,
  onSaveTime,
  onTestNudge,
}: NotificationSectionProps) {
  const { colors, palette } = useTheme();
  const [nudgeKnobOffset] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(nudgeKnobOffset, {
      toValue: nudgeEnabled ? 22 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [nudgeEnabled, nudgeKnobOffset]);
  return (
    <>
      <Text className="mb-2 mt-6 text-[13px] font-bold text-muted">
        {t('settings.sectionNotifications')}
      </Text>
      <View className="overflow-hidden rounded-2xl border border-line bg-surface">
        <SettingRow
          label={t('settings.nudge')}
          muted={!canManageNudge}
          right={
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel={t('settings.nudge')}
              accessibilityState={{ checked: nudgeEnabled }}
              disabled={saving || !canManageNudge}
              onPress={onToggleNudge}
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
          }
        />
        <RowDivider />
        <SettingRow
          label={t('settings.nudgeTime')}
          value={nudgeAt}
          chevron
          onPress={onToggleTimeEditor}
        />
        {timeEditorOpen ? (
          <View>
            <View className="flex-row gap-2 px-4">
              <TextInput
                value={nudgeAt}
                onFocus={() => setNudgeAtDraft('')}
                onBlur={() => setNudgeAtDraft((current) => (current === '' ? null : current))}
                onChangeText={(next) => {
                  setNudgeAtDraft(formatNudgeTimeInput(next));
                  setTimeError(null);
                }}
                editable={Boolean(hasSettings) && !saving}
                inputMode="numeric"
                maxLength={5}
                placeholder="13:00"
                placeholderTextColor="#829BB7"
                className="flex-1 rounded-xl border border-line bg-screen px-3 py-3 font-semibold text-[#26332D]"
              />
              <Pressable
                disabled={saving}
                onPress={onSaveTime}
                style={{ backgroundColor: palette.accent }}
                className="items-center justify-center rounded-xl px-4 disabled:opacity-50">
                <Text className="font-bold text-white">{t('settings.saveTime')}</Text>
              </Pressable>
            </View>
            <View className="mt-3 flex-row gap-2 px-4">
              {['12:00', '13:00', '14:00'].map((time) => (
                <Pressable
                  key={time}
                  disabled={saving}
                  onPress={() => {
                    if (token) {
                      setNudgeAtDraft(time);
                      setTimeError(null);
                    }
                  }}
                  style={nudgeAt === time ? { backgroundColor: palette.accent } : undefined}
                  className={`rounded-lg px-3 py-2 ${nudgeAt === time ? 'bg-lavender' : 'bg-screen'}`}>
                  <Text
                    className={`font-semibold ${nudgeAt === time ? 'text-white' : 'text-muted'}`}>
                    {time}
                  </Text>
                </Pressable>
              ))}
            </View>
            {timeError ? (
              <Text className="mt-2 px-4 text-xs text-[#FF9BA6]">{timeError}</Text>
            ) : null}
            <View className="mt-3">
              <RowDivider />
              <SettingRow
                label={t('settings.nudgeTest')}
                value={testNudgePending ? t('settings.nudgeTestSending') : undefined}
                chevron
                disabled={!token || testNudgePending}
                onPress={onTestNudge}
              />
              {testNudgeResult ? (
                <Text className="px-4 pb-3 text-xs" style={{ color: palette.accent }}>
                  {testNudgeResult === 'preview'
                    ? t('settings.nudgeTestPreviewed')
                    : t('settings.nudgeTestSent')}
                </Text>
              ) : null}
              {testNudgeError ? (
                <Text className="px-4 pb-3 text-xs text-[#FF9BA6]">{testNudgeError}</Text>
              ) : null}
            </View>
          </View>
        ) : null}
        <RowDivider />
        <SettingRow
          label={t('settings.notificationPermission')}
          right={
            permission === 'granted' ? (
              <Text className="text-sm text-muted">{t('settings.permissionGrantedValue')}</Text>
            ) : permission === 'undetermined' ? (
              <Pressable
                accessibilityRole="button"
                onPress={async () => onPermissionChange(await requestNotificationPermission())}
                style={{ backgroundColor: palette.accent }}
                className="rounded-lg px-3 py-2">
                <Text className="text-xs font-bold text-white">
                  {t('settings.allowNotifications')}
                </Text>
              </Pressable>
            ) : (
              <Text className="text-sm text-muted">
                {permission === 'denied'
                  ? t('settings.permissionDeniedValue')
                  : t('settings.permissionUnsupportedValue')}
              </Text>
            )
          }
        />
      </View>
    </>
  );
}
