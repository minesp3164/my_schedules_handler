import type { FocusSession } from '@/services/api';

export const STALE_PAUSED_SESSION_MS = 30 * 60 * 1_000;

// 기본 집중 시각(초). 현재는 테스트용으로 짧게 둔다.
export const focusSeconds = 10;

export function isStalePausedFocus(session: FocusSession | null | undefined, now = Date.now()) {
  if (session?.status !== 'paused' || !session.paused_at) return false;

  const pausedAt = Date.parse(session.paused_at);
  return Number.isFinite(pausedAt) && now - pausedAt >= STALE_PAUSED_SESSION_MS;
}

export const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export const getRemainingSeconds = (session: FocusSession, clock: number) =>
  Math.floor(getRemainingSecondsPrecise(session, clock));

export const getRemainingSecondsPrecise = (session: FocusSession, clock: number) => {
  const stoppedAt =
    session.status === 'paused' && session.paused_at ? Date.parse(session.paused_at) : clock;
  const elapsed = (stoppedAt - Date.parse(session.started_at)) / 1_000 - session.paused_seconds;

  return Math.max(session.planned_seconds - elapsed, 0);
};
