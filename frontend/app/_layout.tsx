import '../global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Stack } from 'expo-router';
import { RealtimeSync } from '@/components/RealtimeSync';
import { ThemeProvider } from '@/services/theme';

const queryClient = new QueryClient();

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SafeAreaProvider>
          <RealtimeSync />
          <Stack screenOptions={{ animation: 'slide_from_right' }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="tasks" options={{ headerShown: false }} />
            <Stack.Screen name="milestones" options={{ headerShown: false }} />
            <Stack.Screen name="rewards/[kind]" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
