import { Platform } from 'react-native';

let nativeModule: typeof import('expo-notifications') | null = null;
let handlerConfigured = false;

export async function notifications() {
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

export async function hasPermission() {
  const module = await notifications();
  if (!module) return false;

  const current = await module.getPermissionsAsync();
  if (current.granted) return true;
  return (await module.requestPermissionsAsync()).granted;
}
