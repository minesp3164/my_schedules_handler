import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const tokenKey = 'reward-tracker-device-token';

export async function getDeviceToken() {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(tokenKey) ?? null;
  return SecureStore.getItemAsync(tokenKey);
}

export async function saveDeviceToken(token: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(tokenKey, token);
    return;
  }
  await SecureStore.setItemAsync(tokenKey, token);
}
