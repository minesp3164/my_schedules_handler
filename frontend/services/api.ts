import { apiBaseUrl } from '@/services/config';
import { t } from '@/services/i18n';
import { createUuid } from '@/services/ids';
import { isOnline } from '@/services/network';
import { enqueueOfflineRequest } from '@/services/offline-queue';
import { syncTodayPointsWidget } from '@/services/today-points-widget';

export type TaskDeferral = {
  deferral_id: string;
  task_template_id: string;
  title: string;
  from_date: string;
  to_date: string;
};

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
    remaining_count: number;
    goal_completed: boolean;
    read_only?: boolean;
    /** 어제에서 회복 패스로 이월되어 온 할 일 */
    deferred_in?: boolean;
    completions: { id: string }[];
  }[];
  /** 오늘 목표에서 회복 패스로 내일 보낸 할 일 */
  deferrals: TaskDeferral[];
  focus_session: {
    id: string;
    kind: 'focus' | 'break';
    status: 'running' | 'paused';
    started_at: string;
    planned_seconds: number;
    paused_seconds: number;
    paused_at: string | null;
    ended_at?: string | null;
  } | null;
};

type ApiResponse<T> = { data: T };

// ngrok 무료판은 브라우저 User-Agent에 경고 페이지를 반환한다. 이 헤더로 우회한다.
const NGROK_SKIP_HEADER = { 'ngrok-skip-browser-warning': '1' } as const;

// 쓰기 요청은 오프라인이거나 전송 중 연결이 끊기면 로컬 큐에 보존하고 재접속 시 재전송한다.
// optimistic 은 큐에 적재될 때 돌려줄 낙관 응답, resolves 는 서버 id 로 갱신할 임시 id 다.
type QueuableRequestInit = RequestInit & {
  optimistic?: () => unknown;
  resolves?: string;
  queueable?: boolean;
};

async function request<T>(path: string, token: string, init?: QueuableRequestInit) {
  const { optimistic, resolves, queueable = true, ...fetchInit } = init ?? {};
  const method = (fetchInit.method ?? 'GET').toUpperCase();
  const shouldQueue = method !== 'GET' && queueable;
  const preserve = async (): Promise<T> => {
    await enqueueOfflineRequest({
      method,
      path,
      body: (fetchInit.body as string | null) ?? null,
      headers: (fetchInit.headers ?? {}) as Record<string, string>,
      token,
      resolves,
    });
    return optimistic?.() as T;
  };
  if (!isOnline()) {
    if (shouldQueue) return preserve();
    throw new Error(t('common.offlineWrite'));
  }
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...fetchInit,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...NGROK_SKIP_HEADER,
        ...fetchInit.headers,
      },
    });
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      const error = new Error(body?.error?.message ?? t('common.requestFailed')) as Error & {
        code?: string;
      };
      error.code = body?.error?.code;
      throw error;
    }
    return body as T;
  } catch (error) {
    // 서버가 응답한 오류가 아니라 전송 자체가 끊긴 경우(TypeError)만 큐에 남긴다.
    if (shouldQueue && error instanceof TypeError) return preserve();
    throw error;
  }
}

export async function getDashboard(token: string) {
  const dashboard = (await request<ApiResponse<Dashboard>>('/dashboard', token)).data;
  syncTodayPointsWidget(dashboard.daily_summary.points_total);
  return dashboard;
}

export function createIdempotencyKey() {
  return createUuid();
}

export type RewardRedemption = {
  id: string;
  reward_kind: 'cheer' | 'recovery' | 'reflection' | 'future' | 'growth';
  status: 'unlocked' | 'redeemed' | 'skipped';
  cost_points: number | null;
  period_key: string | null;
  unlocked_at: string;
  redeemed_at: string | null;
  payload: Record<string, string | number | GrowthCardStats | undefined>;
};

// 성장 카드에 들어가는 실제 월간 기록. 서버가 계산한 값만 신뢰한다.
export type GrowthCardStats = {
  month: string;
  focus_minutes: number;
  applications: number;
  goal_days: number;
  activity_days: number;
  points: number;
};

export type RewardUnlockState = {
  kind: RewardRedemption['reward_kind'];
  threshold: number;
  unit: 'weekly' | 'total' | 'balance';
  progress: number;
  unlocked: boolean;
  available: boolean;
  reason: 'locked' | 'used' | 'held' | 'limit' | null;
  period_key: string | null;
  record: RewardRedemption | null;
  stats?: GrowthCardStats;
};

export type RewardUnlocks = {
  total_points: number;
  earned_points: number;
  weekly_points: number;
  unlocks: RewardUnlockState[];
};

export async function getRewardRedemptions(token: string) {
  return (await request<ApiResponse<RewardRedemption[]>>('/reward-redemptions', token)).data;
}

export async function getRewardUnlocks(token: string) {
  return (await request<ApiResponse<RewardUnlocks>>('/reward-unlocks', token)).data;
}

// 해금형 보상 기록(응원·회복 패스·편지·성장 카드). 포인트는 차감하지 않는다.
export function claimReward(
  token: string,
  rewardKind: string,
  idempotencyKey: string,
  payload: Record<string, string | number | undefined> = {}
) {
  return request<{ data: RewardRedemption & { remaining_points: number; replayed: boolean } }>(
    '/reward-redemptions',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ reward_kind: rewardKind, payload }),
    }
  );
}

// 회복 패스 보유 기록의 '나중에 사용할게요' <-> '다시 보기' 전이.
export function updateRewardStatus(token: string, id: string, status: 'unlocked' | 'skipped') {
  return request<ApiResponse<RewardRedemption>>(`/reward-redemptions/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
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

// 회복 패스 1개로 오늘 할 일 하나를 내일로 보낸다.
export function deferTask(token: string, taskTemplateId: string, idempotencyKey: string) {
  return request<{ data: { deferral: TaskDeferral } }>('/task-deferrals', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ task_template_id: taskTemplateId }),
  });
}

// 오늘 이월을 되돌리고 회복 패스를 되찾는다.
export function undoDefer(token: string, deferralId: string) {
  return request<{ data: { deferral: TaskDeferral } }>(`/task-deferrals/${deferralId}`, token, {
    method: 'DELETE',
  });
}

export type FocusSession = NonNullable<Dashboard['focus_session']>;

export async function getCurrentFocus(token: string) {
  return (await request<ApiResponse<FocusSession | null>>('/focus-sessions/current', token)).data;
}

export function startFocus(
  token: string,
  plannedSeconds: number,
  idempotencyKey: string,
  kind: 'focus' | 'break' = 'focus'
) {
  // 오프라인 시작은 임시 id 로 진행하고, 큐 재전송 성공 시 실제 세션 id 로 갱신한다.
  const optimisticId = `pending:${createUuid()}`;
  const startedAt = new Date().toISOString();
  return request<ApiResponse<FocusSession>>('/focus-sessions', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ focus_session: { planned_seconds: plannedSeconds, kind } }),
    resolves: optimisticId,
    optimistic: () => ({
      data: {
        id: optimisticId,
        kind,
        status: 'running',
        started_at: startedAt,
        planned_seconds: plannedSeconds,
        paused_seconds: 0,
        paused_at: null,
        ended_at: null,
      },
    }),
  });
}

export function controlFocus(
  token: string,
  session: FocusSession,
  action: 'pause' | 'resume' | 'cancel' | 'complete',
  idempotencyKey?: string
) {
  const now = new Date();
  const endedAt = action === 'complete' ? now.toISOString() : null;
  return request(`/focus-sessions/${session.id}/${action}`, token, {
    method: 'PATCH',
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    body: endedAt ? JSON.stringify({ ended_at: endedAt }) : undefined,
    // 오프라인에서도 집중 화면이 이어지도록 스냅샷 기반 낙관 응답을 쓴다.
    optimistic: () => {
      if (action === 'complete') {
        return {
          data: { focus_session: { ...session, ended_at: endedAt }, daily_summary: null },
        };
      }
      if (action === 'pause') {
        return { data: { ...session, status: 'paused', paused_at: now.toISOString() } };
      }
      if (action === 'resume') {
        const pausedSince = session.paused_at ? Date.parse(session.paused_at) : now.getTime();
        return {
          data: {
            ...session,
            status: 'running',
            paused_at: null,
            paused_seconds:
              session.paused_seconds +
              Math.max(Math.floor((now.getTime() - pausedSince) / 1_000), 0),
          },
        };
      }
      return { data: { ...session, status: 'paused', ended_at: now.toISOString() } };
    },
  });
}

export type HistoryDayRecap = {
  tasks_total: number;
  tasks_done: number;
  goal_achieved: boolean;
  deferred: {
    deferral_id: string;
    task_template_id: string;
    title: string;
    to_date: string;
  }[];
};

export type HistoryDay = {
  date: string;
  summary: { points_total: number; all_goals_completed_at: string | null; focus_seconds: number };
  point_events: {
    id: string;
    event_type:
      'task_completion' | 'focus_completion' | 'daily_bonus' | 'reward_redemption' | 'adjustment';
    points: number;
    occurred_at: string;
    reversed_at: string | null;
    source_title: string | null;
    source_kind: string | null;
  }[];
  recap: HistoryDayRecap;
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

export type WeeklyRetro = {
  week_start: string;
  body: string | null;
  updated_at: string | null;
};

export async function getWeeklyRetro(token: string, weekStart: string) {
  return (await request<ApiResponse<WeeklyRetro>>(`/weekly-retro?week_start=${weekStart}`, token))
    .data;
}

export function saveWeeklyRetro(token: string, weekStart: string, body: string) {
  return request<ApiResponse<WeeklyRetro>>('/weekly-retro', token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week_start: weekStart, body }),
    optimistic: () => ({
      data: { week_start: weekStart, body, updated_at: new Date().toISOString() },
    }),
  });
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
    // 오프라인 추가는 임시 id 로 캐시에 먼저 반영한다(재전송 후 서버 id 로 교체된다).
    optimistic: () => ({
      data: {
        id: `pending:${createUuid()}`,
        title: task.title,
        points: task.points ?? 0,
        target_count: task.target_count,
        position: task.position,
        kind: task.kind,
        active: true,
        weekdays: task.weekdays,
      },
    }),
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

export function sendTestNudge(token: string) {
  return request<ApiResponse<{ status: string }>>('/notifications/test-nudge', token, {
    method: 'POST',
  });
}
