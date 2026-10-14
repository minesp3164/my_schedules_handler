import { Platform } from 'react-native';
import { registerNativePushIfAvailable } from '@/services/push-registration';
import { hasPermission, notifications } from './module';
import { ensureWebPermission, webNotificationSupported } from './web';

export type NotificationPermission = 'granted' | 'undetermined' | 'denied' | 'unsupported';

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS === 'web') {
    if (!webNotificationSupported()) return 'unsupported';
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
    if (!webNotificationSupported()) return 'unsupported' as const;
    await ensureWebPermission();
    return getNotificationPermission();
  }

  await hasPermission();
  void registerNativePushIfAvailable();
  return getNotificationPermission();
}
