import { request, type ApiResponse } from './client';

export type Settings = {
  focus_minutes: number;
  break_minutes: number;
  nudge_enabled: boolean;
  nudge_at: string;
  timezone: string;
};

export async function getSettings(token: string) {
  return (await request<ApiResponse<Settings>>('/settings', token)).data;
}

export function updateSettings(token: string, settings: Partial<Settings>) {
  return request('/settings', token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  });
}

export function sendTestNudge(token: string) {
  return request<ApiResponse<{ status: string }>>('/notifications/test-nudge', token, {
    method: 'POST',
  });
}
