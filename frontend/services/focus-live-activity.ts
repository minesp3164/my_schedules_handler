import * as SecureStore from 'expo-secure-store';
import { NativeModules, Platform } from 'react-native';

type FocusLiveActivityModule = {
  status: () => Promise<'enabled' | 'disabled' | 'unsupported'>;
  refresh: () => Promise<void>;
  start: (plannedSeconds: number, endAtMs: number, title: string) => Promise<string | null>;
  update: (activityId: string, remainingSeconds: number, paused: boolean) => Promise<void>;
  end: (activityId: string) => Promise<void>;
};

export type FocusLiveActivityStartResult =
  'started' | 'disabled' | 'unsupported' | 'native-module-missing' | 'failed';

const storageKey = 'focus-live-activity-id';
const nativeModule = NativeModules.FocusLiveActivity as FocusLiveActivityModule | undefined;

function isAvailable() {
  return Platform.OS === 'ios' && Boolean(nativeModule);
}

export async function refreshFocusLiveActivity() {
  if (!isAvailable()) return;
  await nativeModule!.refresh().catch(() => undefined);
}

async function readActivityId() {
  if (!isAvailable()) return null;
  return SecureStore.getItemAsync(storageKey);
}

export async function startFocusLiveActivity(
  plannedSeconds: number,
  endAtMs: number,
  title = '집중 시간'
): Promise<FocusLiveActivityStartResult> {
  if (Platform.OS !== 'ios') return 'unsupported';
  if (!isAvailable()) return 'native-module-missing';

  try {
    const status = await nativeModule!.status();
    if (status !== 'enabled') return status;

    const previousId = await readActivityId();
    if (previousId) await nativeModule!.end(previousId);

    const activityId = await nativeModule!.start(plannedSeconds, endAtMs, title);
    if (activityId) await SecureStore.setItemAsync(storageKey, activityId);
    return activityId ? 'started' : 'failed';
  } catch {
    return 'failed';
  }
}

export async function updateFocusLiveActivity(remainingSeconds: number, paused: boolean) {
  if (!isAvailable()) return;

  try {
    const activityId = await readActivityId();
    if (activityId) await nativeModule!.update(activityId, remainingSeconds, paused);
  } catch {
    // The OS may dismiss a Live Activity at any time.
  }
}

export async function endFocusLiveActivity() {
  if (!isAvailable()) return;

  try {
    const activityId = await readActivityId();
    if (activityId) await nativeModule!.end(activityId);
  } finally {
    await SecureStore.deleteItemAsync(storageKey).catch(() => undefined);
  }
}
