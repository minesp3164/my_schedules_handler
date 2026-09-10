import '../global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Stack } from 'expo-router';
import { RealtimeSync } from '@/components/RealtimeSync';

const queryClient = new QueryClient();

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <RealtimeSync />
        <Stack screenOptions={{ animation: 'slide_from_right' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="activate" options={{ headerShown: false }} />
          <Stack.Screen name="tasks" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
