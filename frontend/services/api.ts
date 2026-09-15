import { t } from '@/services/i18n';
import { createUuid } from '@/services/ids';
import { syncTodayPointsWidget } from '@/services/today-points-widget';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.200.104:3000/api/v1';

export type Dashboard = {
  date: string;
  daily_summary: { points_total: number; daily_bonus_awarded: boolean };
  total_points: number;
  rewards: {
    daily: { required_points: number; current_points: number; achieved: boolean };
    weekly: { required_points: number; current_points: number; achieved: boolean };
  };
  tasks: {
    id: string;
    title: string;
    kind: string;
    points: number;
    target_count: number;
    position: number;
    weekdays: number[];
    completed_count: number;
    goal_completed: boolean;
    read_only?: boolean;
    completions: { id: string }[];
  }[];
  focus_session: {
    id: string;
    status: 'running' | 'paused';
    started_at: string;
    planned_seconds: number;
    paused_seconds: number;
    paused_at: string | null;
  } | null;
};

type ApiResponse<T> = { data: T };

async function request<T>(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? t('common.requestFailed'));
  return body as T;
}

export async function getDashboard(token: string) {
  const dashboard = (await request<ApiResponse<Dashboard>>('/dashboard', token)).data;
  syncTodayPointsWidget(dashboard.daily_summary.points_total);
  return dashboard;
}

export function createIdempotencyKey() {
  return createUuid();
}

export function redeemReward(token: string, rewardKind: string, idempotencyKey: string) {
  return request<{ data: { remaining_points: number } }>('/reward-redemptions', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ reward_kind: rewardKind }),
  });
}

export function completeTask(taskId: string, token: string, idempotencyKey: string) {
  return request(`/task_templates/${taskId}/completions`, token, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

export function revertCompletion(completionId: string, token: string, idempotencyKey: string) {
  return request(`/completions/${completionId}`, token, {
    method: 'DELETE',
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

export type FocusSession = NonNullable<Dashboard['focus_session']>;

export async function getCurrentFocus(token: string) {
  return (await request<ApiResponse<FocusSession | null>>('/focus-sessions/current', token)).data;
}

export function startFocus(token: string, plannedSeconds: number, idempotencyKey: string) {
  return request<ApiResponse<FocusSession>>('/focus-sessions', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ focus_session: { planned_seconds: plannedSeconds } }),
  });
}

export function controlFocus(
  token: string,
  id: string,
  action: 'pause' | 'resume' | 'cancel' | 'complete',
  idempotencyKey?: string
) {
  return request(`/focus-sessions/${id}/${action}`, token, {
    method: 'PATCH',
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    body:
      action === 'complete' ? JSON.stringify({ ended_at: new Date().toISOString() }) : undefined,
  });
}

export type HistoryDay = {
  date: string;
  summary: { points_total: number; all_goals_completed_at: string | null };
  point_events: {
    id: string;
    event_type:
      'task_completion' | 'focus_completion' | 'daily_bonus' | 'reward_redemption' | 'adjustment';
    points: number;
    occurred_at: string;
    reversed_at: string | null;
    source_title: string | null;
  }[];
};

export type MilestoneProgress = {
  activity_days: number;
  focus_minutes: number;
  completed_tasks: number;
  created_tasks: number;
};

export async function getMilestones(token: string) {
  return (await request<ApiResponse<MilestoneProgress>>('/milestones', token)).data;
}
export type Settings = {
  focus_minutes: number;
  break_minutes: number;
  nudge_enabled: boolean;
  nudge_at: string;
  timezone: string;
};

export async function getHistory(token: string, from: string, to: string) {
  return (
    await request<ApiResponse<{ days: HistoryDay[] }>>(`/history?from=${from}&to=${to}`, token)
  ).data.days;
}

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

export type TaskTemplate = {
  id: string;
  title: string;
  points: number;
  target_count: number;
  position: number;
  kind: string;
  active: boolean;
  weekdays: number[];
};

export async function getTaskTemplates(token: string) {
  return (await request<ApiResponse<TaskTemplate[]>>('/task_templates', token)).data;
}

export type NewTaskTemplate = Omit<TaskTemplate, 'id' | 'active' | 'points'> & {
  points?: number;
};

export function createTaskTemplate(token: string, task: NewTaskTemplate) {
  return request<ApiResponse<TaskTemplate>>('/task_templates', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_template: task }),
  });
}

export function updateTaskTemplate(token: string, id: string, task: NewTaskTemplate) {
  return request<ApiResponse<TaskTemplate>>(`/task_templates/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_template: task }),
  });
}

export function deactivateTaskTemplate(token: string, id: string) {
  return request(`/task_templates/${id}`, token, { method: 'DELETE' });
}

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
}) {
  const response = await fetch(`${apiBaseUrl}/devices/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      device: {
        installation_id: input.installationId,
        name: input.name,
        platform: input.platform,
      },
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? t('common.connectFailed'));
  return body.data as { access_token: string };
}
