import type { QueryClient } from '@tanstack/react-query';
import { controlFocus, createIdempotencyKey, type FocusSession, startFocus } from '@/services/api';
import { cancelFocusCompletion, scheduleFocusCompletion } from '@/services/focus-notifications';
import { t } from '@/services/i18n';
import {
  endFocusLiveActivity,
  startFocusLiveActivity,
  updateFocusLiveActivity,
  type FocusLiveActivityStartResult,
} from '@/services/focus-live-activity';
import { getRemainingSecondsPrecise } from '@/services/focus-session';
import { syncTodayPointsWidget } from '@/services/today-points-widget';

export type FocusAction = 'start' | 'start-break' | 'pause' | 'resume' | 'cancel' | 'complete';

// 라이브 액티비티 시작이 실패한 이유별 안내 문구. 성공('started')은 알림을 띄우지 않는다.
const LIVE_ACTIVITY_NOTICES: Partial<Record<FocusLiveActivityStartResult, string>> = {
  disabled: 'focus.liveActivity.permissionRequired',
  'native-module-missing': 'focus.liveActivity.reinstallRequired',
  unsupported: 'focus.liveActivity.unsupported',
  failed: 'focus.liveActivity.startFailed',
};

export function createFocusMutationFn(
  token: string | null | undefined,
  session: FocusSession | null | undefined,
  focusSeconds: number
) {
  return async (action: FocusAction): Promise<unknown> => {
    if (!token) throw new Error(t('common.connectFirst'));
    if (action === 'start') return startFocus(token, focusSeconds, createIdempotencyKey());
    if (action === 'start-break') {
      const breakSeconds = 10; // 테스트용 — 실제로는 settings.break_minutes * 60 사용
      return startFocus(token, breakSeconds, createIdempotencyKey(), 'break');
    }
    return controlFocus(
      token,
      session!,
      action,
      action === 'complete' ? createIdempotencyKey() : undefined
    );
  };
}

export function createFocusOnMutate(queryClient: QueryClient, setNow: (clock: number) => void) {
  return async (action: FocusAction) => {
    await queryClient.cancelQueries({ queryKey: ['focus-session'] });
    const previous = queryClient.getQueryData<FocusSession | null>(['focus-session']);
    const actionTime = Date.now();

    if (action === 'pause' && previous?.status === 'running') {
      queryClient.setQueryData<FocusSession>(['focus-session'], {
        ...previous,
        status: 'paused',
        paused_at: new Date(actionTime).toISOString(),
      });
    }

    if (action === 'resume' && previous?.status === 'paused') {
      const pausedSince = previous.paused_at ? Date.parse(previous.paused_at) : actionTime;
      queryClient.setQueryData<FocusSession>(['focus-session'], {
        ...previous,
        status: 'running',
        paused_at: null,
        paused_seconds:
          previous.paused_seconds + Math.max(Math.floor((actionTime - pausedSince) / 1_000), 0),
      });
    }

    setNow(actionTime);
    return { previous };
  };
}

export type FocusSuccessDeps = {
  queryClient: QueryClient;
  screenFocused: { current: boolean };
  setCompletedKind: (kind: 'focus' | 'break') => void;
  setJustCompleted: (value: boolean) => void;
  setLiveActivityNotice: (notice: string | undefined) => void;
  setNow: (clock: number) => void;
  /** 방금 끝난 집중이면 자동으로 휴식을 시작한다(스스로를 다시 부른다). */
  startBreak: () => void;
};

export function createFocusOnSuccess({
  queryClient,
  screenFocused,
  setCompletedKind,
  setJustCompleted,
  setLiveActivityNotice,
  setNow,
  startBreak,
}: FocusSuccessDeps) {
  return async (result: unknown, action: FocusAction) => {
    const focus = (result as { data: FocusSession }).data;

    if (action === 'start' || action === 'start-break') {
      queryClient.setQueryData(['focus-session'], focus);
      setJustCompleted(false);
      setNow(Date.now());
      await scheduleFocusCompletion(focus.id, focus.planned_seconds, focus.kind);
      const endAtMs =
        Date.parse(focus.started_at) + (focus.planned_seconds + focus.paused_seconds) * 1_000;
      const liveActivityResult = await startFocusLiveActivity(
        focus.planned_seconds,
        endAtMs,
        focus.kind === 'break' ? t('focus.breakTitle') : t('focus.title')
      );
      const noticeKey = LIVE_ACTIVITY_NOTICES[liveActivityResult];
      setLiveActivityNotice(noticeKey ? t(noticeKey) : undefined);
    } else if (action === 'pause' || action === 'resume' || action === 'cancel') {
      queryClient.setQueryData(['focus-session'], focus);
      setNow(Date.now());

      if (action === 'resume') {
        const remainingSeconds = getRemainingSecondsPrecise(focus, Date.now());
        await scheduleFocusCompletion(focus.id, remainingSeconds);
        await updateFocusLiveActivity(remainingSeconds, false);
      } else {
        await cancelFocusCompletion(focus.id);
        if (action === 'pause') {
          await updateFocusLiveActivity(getRemainingSecondsPrecise(focus, Date.now()), true);
        } else {
          await endFocusLiveActivity();
        }
      }
    } else if (action === 'complete') {
      const completed = result as {
        data: { focus_session: FocusSession; daily_summary: { points_total: number } | null };
      };
      const finishedSession = completed.data.focus_session;
      setCompletedKind(finishedSession.kind);
      if (completed.data.daily_summary) {
        syncTodayPointsWidget(completed.data.daily_summary.points_total);
      }
      if (screenFocused.current) setJustCompleted(true);
      await endFocusLiveActivity();

      const endedAt = Date.parse(finishedSession.ended_at ?? '');
      const freshCompletion = Number.isFinite(endedAt) && Date.now() - endedAt < 60_000;
      if (finishedSession.kind === 'focus' && freshCompletion) {
        startBreak();
      }
    }
    await queryClient.invalidateQueries({ queryKey: ['focus-session'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    if (action === 'complete') {
      await queryClient.invalidateQueries({ queryKey: ['history'] });
      await queryClient.invalidateQueries({ queryKey: ['milestones'] });
      await queryClient.invalidateQueries({ queryKey: ['badges'] });
    }
  };
}
