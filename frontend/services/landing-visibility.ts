import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const landingSeenAtKey = 'reward-tracker-landing-seen-at';
const landingCooldownMs = 6 * 60 * 60 * 1000;

export async function hasSeenLandingRecently() {
  const value = await read(landingSeenAtKey);
  const seenAt = Number(value);
  return Number.isFinite(seenAt) && Date.now() - seenAt < landingCooldownMs;
}

export function markLandingSeen() {
  return write(landingSeenAtKey, String(Date.now()));
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
