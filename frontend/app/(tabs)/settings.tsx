import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { useRequireLogin } from '@/services/use-require-login';
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from '@/services/focus-notifications';
import { t } from '@/services/i18n';

export default function Settings() {
  const [token, setToken] = useState<string | null>();
  const requireLogin = useRequireLogin();
  const [nudgeAtDraft, setNudgeAtDraft] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');
  const queryClient = useQueryClient();
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
    if (!requireLogin(token)) return;
    if (!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(nudgeAt)) {
      setTimeError(t('settings.invalidTime'));
      return;
    }
    setTimeError(null);
    update.mutate({ nudge_at: nudgeAt });
  };
  return (
    <SafeAreaView className="flex-1 bg-screen">
      <ScrollView contentContainerClassName="px-5 pb-8 pt-8">
        <Text className="text-2xl font-bold text-[#173052]">{t('settings.title')}</Text>
        <Text className="mt-2 text-sm text-muted">{t('settings.description')}</Text>
        {!token ? (
          <Text className="mt-6 rounded-xl bg-surface p-4 text-muted">{t('settings.connect')}</Text>
        ) : null}
        <View className="mt-6 rounded-2xl border border-line bg-surface p-4">
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
                if (!requireLogin(token)) return;
                update.mutate({ nudge_enabled: next });
              }}
              trackColor={{ false: '#D8E7F5', true: '#2479CC' }}
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
                  if (!requireLogin(token)) return;
                  setNudgeAtDraft(time);
                  setTimeError(null);
                }}
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
              className="mt-3 self-start rounded-xl bg-lavender px-4 py-3 transition duration-150 hover:-translate-y-px hover:opacity-90">
              <Text className="font-bold text-white">{t('settings.allowNotifications')}</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => {
            if (!requireLogin(token)) return;
            router.push('/tasks');
          }}
          className="mt-4 rounded-2xl border border-line bg-surface p-4 transition duration-150 hover:-translate-y-px hover:bg-[#EAF4FF]">
          <Text className="font-bold text-[#173052]">{t('settings.manageTasks')}</Text>
          <Text className="mt-1 text-sm text-muted">{t('settings.manageTasksDescription')}</Text>
        </Pressable>
        {settings.isError ? (
          <Text className="mt-4 text-sm text-[#FF9BA6]">{settings.error.message}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
