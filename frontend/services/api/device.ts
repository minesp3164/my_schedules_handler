import { apiBaseUrl } from '@/services/config';
import { t } from '@/services/i18n';
import { NGROK_SKIP_HEADER, request, type ApiResponse } from './client';

type WebPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export function registerPushSubscription(
  token: string,
  subscription: { expoPushToken: string } | { webPushSubscription: WebPushSubscription }
) {
  return request('/push-subscriptions', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      push_subscription:
        'expoPushToken' in subscription
          ? { expo_push_token: subscription.expoPushToken }
          : { web_push_subscription: subscription.webPushSubscription },
    }),
  });
}

export async function activateDevice(input: {
  installationId: string;
  name: string;
  platform: string;
  accessKey?: string;
}) {
  const response = await fetch(`${apiBaseUrl}/devices/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...NGROK_SKIP_HEADER,
    },
    body: JSON.stringify({
      device: {
        installation_id: input.installationId,
        name: input.name,
        platform: input.platform,
        access_key: input.accessKey,
      },
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? t('common.connectFailed'));
  return body.data as { access_token: string };
}

export async function issueRealtimeTicket(token: string) {
  const body = await request<ApiResponse<{ ticket: string }>>('/realtime-tickets', token, {
    method: 'POST',
    // 티켓은 접속 순간에만 유효하므로 오프라인 큐에 보존하지 않는다.
    queueable: false,
  });
  return body.data.ticket;
}
