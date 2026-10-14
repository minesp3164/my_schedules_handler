import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { t } from '@/services/i18n';
import {
  registerNativePushIfAvailable,
  registerWebPushIfAvailable,
} from '@/services/push-registration';
import { hasPermission, notifications } from './module';
import { ensureWebPermission } from './web';

// SecureStore keys allow only alphanumeric characters, dots, hyphens, and underscores.
const notificationKey = (sessionId: string) => `focus-notification-${sessionId}`;

function focusNotificationText(kind: 'focus' | 'break') {
  return {
    title: t(kind === 'break' ? 'focus.breakNotificationTitle' : 'focus.notificationTitle'),
    body: t(kind === 'break' ? 'focus.breakNotificationBody' : 'focus.notificationBody'),
  };
}

export async function scheduleFocusCompletion(
  sessionId: string,
  seconds: number,
  kind: 'focus' | 'break' = 'focus'
) {
  if (Platform.OS === 'web') {
    await ensureWebPermission();
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
  const { title, body } = focusNotificationText(kind);
  const identifier = await module.scheduleNotificationAsync({
    content: {
      title,
      body,
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
    const { title, body } = focusNotificationText(kind);
    new globalThis.Notification(title, { body });
  }
}
