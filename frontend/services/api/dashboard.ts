import { syncTodayPointsWidget } from '@/services/today-points-widget';
import { request, type ApiResponse } from './client';

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
    completions: {
      id: string;
      note: string | null;
      note_verified: boolean | null;
      /** 지원 단계 기록이 자동으로 채운 완료 — 지원 현황에서만 되돌린다 */
      stage_backed?: boolean;
    }[];
  }[];
  /** 오늘 목표에서 회복 패스로 내일 보낸 할 일 */
  deferrals: TaskDeferral[];
  /** 홈 "진행 중인 지원" 카드 한 줄 요약 */
  applications: {
    active_count: number;
    recent: { id: string; company: string }[];
  };
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

export async function getDashboard(token: string) {
  const dashboard = (await request<ApiResponse<Dashboard>>('/dashboard', token)).data;
  syncTodayPointsWidget(dashboard.daily_summary.points_total);
  return dashboard;
}

export function completeTask(
  taskId: string,
  token: string,
  idempotencyKey: string,
  note?: string,
  companyId?: string
) {
  const body = note || companyId ? JSON.stringify({ note, company_id: companyId }) : undefined;
  return request(`/task_templates/${taskId}/completions`, token, {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
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
