import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  controlFocus,
  createIdempotencyKey,
  type FocusSession,
  getCurrentFocus,
  getSettings,
  startFocus,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import {
  cancelFocusCompletion,
  scheduleFocusCompletion,
  showWebFocusCompletion,
} from '@/services/focus-notifications';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import { syncTodayPointsWidget } from '@/services/today-points-widget';
import {
  endFocusLiveActivity,
  startFocusLiveActivity,
  updateFocusLiveActivity,
} from '@/services/focus-live-activity';
import { FocusSessionPanel } from '@/components/focus/FocusSessionPanel';
import { isStalePausedFocus } from '@/services/focus-session';

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

const getRemainingSeconds = (session: FocusSession, clock: number) =>
  Math.floor(getRemainingSecondsPrecise(session, clock));

const getRemainingSecondsPrecise = (session: FocusSession, clock: number) => {
  const stoppedAt =
    session.status === 'paused' && session.paused_at ? Date.parse(session.paused_at) : clock;
  const elapsed = (stoppedAt - Date.parse(session.started_at)) / 1_000 - session.paused_seconds;

  return Math.max(session.planned_seconds - elapsed, 0);
};
const focusSeconds = 10;

export default function Focus() {
  const [token, setToken] = useState<string | null>();
  const [now, setNow] = useState(() => Date.now());
  const [liveActivityNotice, setLiveActivityNotice] = useState<string | undefined>();
  const [justCompleted, setJustCompleted] = useState(false);
  const [completedKind, setCompletedKind] = useState<'focus' | 'break'>('focus');
  const notifiedSession = useRef<string | null>(null);
  const screenFocused = useRef(true);
  useFocusEffect(
    useCallback(() => {
      screenFocused.current = true;
      return () => {
        screenFocused.current = false;
        setJustCompleted(false);
      };
    }, [])
  );
  const queryClient = useQueryClient();
  const { palette } = useTheme();
  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);
  const current = useQuery({
    queryKey: ['focus-session'],
    queryFn: () => getCurrentFocus(token!),
    enabled: Boolean(token),
    refetchInterval: 15_000,
  });
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings(token!),
    enabled: Boolean(token),
  });
  const breakMinutes = settings.data?.break_minutes ?? 5;
  const breakSeconds = 10; // 테스트용 — 실제로는 breakMinutes * 60 사용
  const session = current.data;
  useEffect(() => {
    if (session?.status !== 'running') return;
    let frame = requestAnimationFrame(function tick() {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [session?.status]);
  const remaining = useMemo(() => {
    if (!session) return focusSeconds;
    return getRemainingSeconds(session, now);
  }, [session, now]);
  const finished = session?.status === 'running' && remaining === 0;
  const remainingPrecise = session ? getRemainingSecondsPrecise(session, now) : 0;
  const progress = session
    ? Math.min(Math.max(1 - remainingPrecise / session.planned_seconds, 0), 1)
    : 1;
  const stalePaused = isStalePausedFocus(session, now);
  const mutation = useMutation({
    mutationFn: async (
      action: 'start' | 'start-break' | 'pause' | 'resume' | 'cancel' | 'complete'
    ) => {
      if (!token) throw new Error(t('common.connectFirst'));
      if (action === 'start') return startFocus(token, focusSeconds, createIdempotencyKey());
      if (action === 'start-break')
        return startFocus(token, breakSeconds, createIdempotencyKey(), 'break');
      return controlFocus(
        token,
        session!,
        action,
        action === 'complete' ? createIdempotencyKey() : undefined
      );
    },
    onMutate: async (action) => {
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
    },
    onError: (_error, _action, context) => {
      queryClient.setQueryData(['focus-session'], context?.previous ?? null);
      setNow(Date.now());
    },
    onSuccess: async (result, action) => {
      const focus = (result as { data: FocusSession }).data;

      if (action === 'start' || action === 'start-break') {
        queryClient.setQueryData(['focus-session'], focus);
        setJustCompleted(false);
        setNow(Date.now());
        await scheduleFocusCompletion(focus.id, focus.planned_seconds, focus.kind);
        const endAtMs =
          Date.parse(focus.started_at) +
          (focus.planned_seconds + focus.paused_seconds) * 1_000;
        const liveActivityResult = await startFocusLiveActivity(
          focus.planned_seconds,
          endAtMs,
          focus.kind === 'break' ? t('focus.breakTitle') : t('focus.title')
        );
        if (liveActivityResult === 'disabled') {
          setLiveActivityNotice('iPhone 설정에서 이 앱의 실시간 현황을 허용해 주세요.');
        } else if (liveActivityResult === 'native-module-missing') {
          setLiveActivityNotice('최신 iPhone 앱으로 다시 설치한 뒤 집중을 시작해 주세요.');
        } else if (liveActivityResult === 'unsupported') {
          setLiveActivityNotice('실시간 현황은 iOS 16.2 이상에서 사용할 수 있어요.');
        } else if (liveActivityResult === 'failed') {
          setLiveActivityNotice(
            '실시간 현황을 시작하지 못했어요. 앱을 다시 설치한 뒤 시도해 주세요.'
          );
        } else {
          setLiveActivityNotice(undefined);
        }
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
          mutation.mutate('start-break');
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['focus-session'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (action === 'complete') {
        await queryClient.invalidateQueries({ queryKey: ['history'] });
        await queryClient.invalidateQueries({ queryKey: ['milestones'] });
      }
    },
  });
  useEffect(() => {
    if (!session || session.status !== 'running' || remaining > 0) return;
    if (notifiedSession.current === session.id) return;
    notifiedSession.current = session.id;
    showWebFocusCompletion(session.kind);
    void endFocusLiveActivity();
    mutation.mutate('complete');
  }, [remaining, session, mutation]);
  const primary = !session
    ? (['start', t('focus.start')] as const)
    : session.status === 'paused'
      ? (['resume', t('focus.resume')] as const)
      : (['pause', t('focus.pause')] as const);
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <FocusSessionPanel
        remainingLabel={formatTime(remaining)}
        statusLabel={
          session?.status === 'paused'
            ? t('focus.paused')
            : session?.kind === 'break'
              ? t('focus.breakRunning')
              : session
                ? t('focus.running')
                : t('focus.default', { minutes: 25 })
        }
        primaryLabel={primary[1]}
        progress={progress}
        hasSession={Boolean(session)}
        isStalePaused={stalePaused}
        finished={finished || justCompleted}
        finishedLabel={
          (session?.kind ?? completedKind) === 'break' ? t('focus.breakFinished') : undefined
        }
        isPending={mutation.isPending}
        error={mutation.isError ? mutation.error.message : liveActivityNotice}
        onPrimary={() => token && mutation.mutate(primary[0])}
        onCancel={() => mutation.mutate('cancel')}
        titleLabel={session?.kind === 'break' ? t('focus.breakTitle') : undefined}
      />
    </SafeAreaView>
  );
}
