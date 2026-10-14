import { createUuid } from '@/services/ids';
import { request, type ApiResponse } from './client';
import type { Dashboard } from './dashboard';

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
