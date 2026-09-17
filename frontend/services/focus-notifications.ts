import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { t } from '@/services/i18n';
import {
  registerNativePushIfAvailable,
  registerWebPushIfAvailable,
} from '@/services/push-registration';

// SecureStore keys allow only alphanumeric characters, dots, hyphens, and underscores.
const notificationKey = (sessionId: string) => `focus-notification-${sessionId}`;
let nativeModule: typeof import('expo-notifications') | null = null;
let handlerConfigured = false;

export type NotificationPermission = 'granted' | 'undetermined' | 'denied' | 'unsupported';

async function notifications() {
  if (Platform.OS === 'web') return null;
  if (!nativeModule) nativeModule = await import('expo-notifications');

  if (!handlerConfigured) {
    nativeModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  }

  return nativeModule;
}

async function hasPermission() {
  const module = await notifications();
  if (!module) return false;

  const current = await module.getPermissionsAsync();
  if (current.granted) return true;
  return (await module.requestPermissionsAsync()).granted;
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS === 'web') {
    if (!('Notification' in globalThis)) return 'unsupported';
    return globalThis.Notification.permission === 'default'
      ? 'undetermined'
      : globalThis.Notification.permission;
  }

  const module = await notifications();
  if (!module) return 'unsupported';
  const permission = await module.getPermissionsAsync();
  if (permission.granted) return 'granted';
  return permission.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') {
    if (!('Notification' in globalThis)) return 'unsupported' as const;
    if (globalThis.Notification.permission === 'default') {
      await globalThis.Notification.requestPermission();
    }
    return getNotificationPermission();
  }

  await hasPermission();
  void registerNativePushIfAvailable();
  return getNotificationPermission();
}

export async function scheduleFocusCompletion(
  sessionId: string,
  seconds: number,
  kind: 'focus' | 'break' = 'focus'
) {
  if (Platform.OS === 'web') {
    if ('Notification' in globalThis && globalThis.Notification.permission === 'default') {
      await globalThis.Notification.requestPermission();
    }
    void registerWebPushIfAvailable();
    return;
  }

  const module = await notifications();
  if (!module || !(await hasPermission())) return;
  void registerNativePushIfAvailable();

  if (Platform.OS === 'android') {
    await module.setNotificationChannelAsync('focus-completion', {
      name: t('focus.notificationChannel'),
      importance: module.AndroidImportance.HIGH,
    });
  }

  await cancelFocusCompletion(sessionId);
  const identifier = await module.scheduleNotificationAsync({
    content: {
      title: t(kind === 'break' ? 'focus.breakNotificationTitle' : 'focus.notificationTitle'),
      body: t(kind === 'break' ? 'focus.breakNotificationBody' : 'focus.notificationBody'),
      sound: 'default',
      data: { sessionId },
    },
    trigger: {
      type: module.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.ceil(seconds)),
      channelId: 'focus-completion',
    },
  });
  await SecureStore.setItemAsync(notificationKey(sessionId), identifier);
}

export async function cancelFocusCompletion(sessionId: string) {
  if (Platform.OS === 'web') return;

  const identifier = await SecureStore.getItemAsync(notificationKey(sessionId));
  if (!identifier) return;

  const module = await notifications();
  await module?.cancelScheduledNotificationAsync(identifier);
  await SecureStore.deleteItemAsync(notificationKey(sessionId));
}

export function showWebFocusCompletion(kind: 'focus' | 'break' = 'focus') {
  if (Platform.OS !== 'web' || !('Notification' in globalThis)) return;
  if (globalThis.Notification.permission === 'granted') {
    new globalThis.Notification(
      t(kind === 'break' ? 'focus.breakNotificationTitle' : 'focus.notificationTitle'),
      { body: t(kind === 'break' ? 'focus.breakNotificationBody' : 'focus.notificationBody') }
    );
  }
}

export async function previewNudgeNotification() {
  const title = t('settings.nudgePreviewTitle');
  const body = t('settings.nudgePreviewBody');

  if (Platform.OS === 'web') {
    if (!('Notification' in globalThis)) return false;
    if (globalThis.Notification.permission === 'default') {
      await globalThis.Notification.requestPermission();
    }
    if (globalThis.Notification.permission !== 'granted') return false;
    new globalThis.Notification(title, { body });
    return true;
  }

  const module = await notifications();
  if (!module || !(await hasPermission())) return false;
  await module.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: { type: module.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
  });
  return true;
}

export async function previewFocusCompletion() {
  if (Platform.OS === 'web') {
    if (!('Notification' in globalThis)) return false;
    if (globalThis.Notification.permission === 'default') {
      await globalThis.Notification.requestPermission();
    }
    void registerWebPushIfAvailable();
    showWebFocusCompletion();
    return globalThis.Notification.permission === 'granted';
  }

  const module = await notifications();
  if (!module || !(await hasPermission())) return false;
  await module.scheduleNotificationAsync({
    content: {
      title: t('focus.notificationTitle'),
      body: t('focus.notificationBody'),
      sound: 'default',
    },
    trigger: null,
  });
  return true;
}
