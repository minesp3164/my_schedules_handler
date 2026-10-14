import { request, type ApiResponse } from './client';

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
      | 'task_completion'
      | 'focus_completion'
      | 'daily_bonus'
      | 'reward_redemption'
      | 'adjustment'
      | 'application_milestone';
    points: number;
    occurred_at: string;
    reversed_at: string | null;
    source_title: string | null;
    source_kind: string | null;
    source_note: string | null;
  }[];
  recap: HistoryDayRecap;
};

export type MilestoneProgress = {
  activity_days: number;
  focus_minutes: number;
  completed_tasks: number;
  created_tasks: number;
  application_completions: number;
  algorithm_completions: number;
  portfolio_completions: number;
  first_activity_date: string | null;
};

export type BadgeCategory = 'routine' | 'steady' | 'focus' | 'apply' | 'algorithm' | 'portfolio';

export type BadgeMetric =
  | 'activity_days'
  | 'focus_minutes'
  | 'completed_tasks'
  | 'created_tasks'
  | 'application_completions'
  | 'algorithm_completions'
  | 'portfolio_completions';

export type Badge = {
  key: string;
  category: BadgeCategory;
  title: string;
  description: string;
  icon: string;
  metric: BadgeMetric;
  threshold: number;
  position: number;
  achieved_at: string | null;
};

export type BadgesResponse = {
  badges: Badge[];
  progress: MilestoneProgress;
};

// 응답을 받을 때 서버가 배지를 평가하므로, 읽기만으로 달성 상태가 갱신된다.
export async function getBadges(token: string) {
  return (await request<ApiResponse<BadgesResponse>>('/badges', token)).data;
}

export async function getMilestones(token: string) {
  return (await request<ApiResponse<MilestoneProgress>>('/milestones', token)).data;
}

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
