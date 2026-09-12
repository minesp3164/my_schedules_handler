import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushSubscription } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';

const vapidPublicKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

function base64UrlToUint8Array(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = globalThis.atob(base64);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

export async function registerNativePushIfAvailable() {
  if (Platform.OS === 'web') return false;

  const token = await getDeviceToken();
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!token || !projectId) return false;

  try {
    const Notifications = await import('expo-notifications');
    if (!(await Notifications.getPermissionsAsync()).granted) return false;
    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await registerPushSubscription(token, { expoPushToken });
    return true;
  } catch {
    return false;
  }
}

export async function registerWebPushIfAvailable() {
  if (Platform.OS !== 'web' || !vapidPublicKey || !('serviceWorker' in navigator)) return false;
  if (!('Notification' in globalThis) || globalThis.Notification.permission !== 'granted')
    return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
      }));
    const payload = subscription.toJSON();
    const token = await getDeviceToken();
    if (!token || !payload.endpoint || !payload.keys?.p256dh || !payload.keys.auth) return false;

    await registerPushSubscription(token, {
      webPushSubscription: {
        endpoint: payload.endpoint,
        keys: { p256dh: payload.keys.p256dh, auth: payload.keys.auth },
      },
    });
    return true;
  } catch {
    return false;
  }
}
