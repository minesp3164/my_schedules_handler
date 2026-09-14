import type { FocusSession } from '@/services/api';

export const STALE_PAUSED_SESSION_MS = 30 * 60 * 1_000;

export function isStalePausedFocus(session: FocusSession | null | undefined, now = Date.now()) {
  if (session?.status !== 'paused' || !session.paused_at) return false;

  const pausedAt = Date.parse(session.paused_at);
  return Number.isFinite(pausedAt) && now - pausedAt >= STALE_PAUSED_SESSION_MS;
}
