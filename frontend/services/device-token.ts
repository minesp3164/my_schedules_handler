import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { activateDevice } from '@/services/api';
import { createUuid } from '@/services/ids';

const tokenKey = 'reward-tracker-device-token';
const installationIdKey = 'reward-tracker-installation-id';
let activation: Promise<string> | undefined;

export async function getDeviceToken() {
  const token = await read(tokenKey);
  if (token) return token;

  activation ??= activateNewDevice().finally(() => {
    activation = undefined;
  });
  return activation;
}

export async function saveDeviceToken(token: string) {
  await write(tokenKey, token);
}

async function activateNewDevice() {
  let installationId = await read(installationIdKey);
  if (!installationId) {
    installationId = createUuid();
    await write(installationIdKey, installationId);
  }

  const result = await activateDevice({
    installationId,
    name: Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android' : 'Web',
    platform: Platform.OS,
    accessKey: process.env.EXPO_PUBLIC_PERSONAL_ACCESS_KEY,
  });
  await saveDeviceToken(result.access_token);
  return result.access_token;
}

async function read(key: string) {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}
