import { createConsumer } from '@rails/actioncable';
import { Platform } from 'react-native';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.200.104:3000/api/v1';
const cableUrl = `${apiUrl.replace(/\/api\/v1$/, '').replace(/^http/, 'ws')}/cable`;

export function subscribeToTracker(token: string, onEvent: () => void) {
  if (Platform.OS !== 'web') return () => undefined;

  const consumer = createConsumer(`${cableUrl}?token=${encodeURIComponent(token)}`);
  const subscription = consumer.subscriptions.create('TrackerChannel', { received: onEvent });
  return () => {
    subscription.unsubscribe();
    consumer.disconnect();
  };
}
