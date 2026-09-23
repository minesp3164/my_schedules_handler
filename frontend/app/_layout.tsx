import '../global.css';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/OfflineBanner';
import { RealtimeSync } from '@/components/RealtimeSync';
import { initNetworkMonitor } from '@/services/network';
import { ThemeProvider } from '@/services/theme';

const queryClient = new QueryClient();
// 웹은 localStorage를 직접 쓰고, 네이티브는 모듈 누락(구버전 바이너리)이어도 앱이 죽지 않게 감싼다.
const webStorage = {
  getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};
const safeNativeStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // 네이티브 모듈이 없으면 캐시 지속만 끈다.
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // 동일
    }
  },
};
const persister = createAsyncStoragePersister({
  storage: Platform.OS === 'web' ? webStorage : safeNativeStorage,
});
const PERSISTED_KEYS = new Set([
  'dashboard',
  'history',
  'history-calendar',
  'milestones',
  'point-history',
  'redemptions',
  'reward-unlocks',
  'retro-week',
  'settings',
  'task-templates',
]);

initNetworkMonitor(queryClient);

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success' &&
            PERSISTED_KEYS.has(String(query.queryKey[0])),
        },
      }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <RealtimeSync />
          <OfflineBanner />
          <Stack screenOptions={{ animation: 'slide_from_right' }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="tasks" options={{ headerShown: false }} />
            <Stack.Screen name="milestones" options={{ headerShown: false }} />
            <Stack.Screen name="weekly-retro" options={{ headerShown: false }} />
            <Stack.Screen name="point-history" options={{ headerShown: false }} />
            <Stack.Screen name="rewards/[kind]" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
