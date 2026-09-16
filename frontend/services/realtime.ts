import { createConsumer } from '@rails/actioncable';
import { Platform } from 'react-native';
import { issueRealtimeTicket } from '@/services/api';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.200.104:3000/api/v1';
const cableUrl = `${apiUrl.replace(/\/api\/v1$/, '').replace(/^http/, 'ws')}/cable`;

export function subscribeToTracker(token: string, onEvent: () => void) {
  if (Platform.OS !== 'web') return () => undefined;

  let consumer: ReturnType<typeof createConsumer> | undefined;
  let closed = false;

  issueRealtimeTicket(token)
    .then((ticket) => {
      if (closed) return;
      consumer = createConsumer(`${cableUrl}?ticket=${encodeURIComponent(ticket)}`);
      consumer.subscriptions.create('TrackerChannel', { received: onEvent });
    })
    .catch(() => undefined);

  return () => {
    closed = true;
    consumer?.disconnect();
  };
}
