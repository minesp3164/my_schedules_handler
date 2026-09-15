import { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  controlFocus,
  createIdempotencyKey,
  type FocusSession,
  getCurrentFocus,
  startFocus,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import {
  cancelFocusCompletion,
  previewFocusCompletion,
  scheduleFocusCompletion,
  showWebFocusCompletion,
} from '@/services/focus-notifications';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import { syncTodayPointsWidget } from '@/services/today-points-widget';
import { FocusSessionPanel } from '@/components/focus/FocusSessionPanel';
import { isStalePausedFocus } from '@/services/focus-session';

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

const getRemainingSeconds = (session: FocusSession, clock: number) => {
  const stoppedAt =
    session.status === 'paused' && session.paused_at ? Date.parse(session.paused_at) : clock;
  const elapsed =
    Math.floor((stoppedAt - Date.parse(session.started_at)) / 1_000) - session.paused_seconds;

  return Math.max(session.planned_seconds - elapsed, 0);
};
const focusSeconds = 25 * 60;

export default function Focus() {
  const [token, setToken] = useState<string | null>();
  const [now, setNow] = useState(() => Date.now());
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const notifiedSession = useRef<string | null>(null);
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
  const session = current.data;
  useEffect(() => {
    if (session?.status !== 'running') return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [session?.status]);
  const remaining = useMemo(() => {
    if (!session) return focusSeconds;
    return getRemainingSeconds(session, now);
  }, [session, now]);
  useEffect(() => {
    if (!session || session.status !== 'running' || remaining > 0) return;
    if (notifiedSession.current === session.id) return;
    notifiedSession.current = session.id;
    showWebFocusCompletion();
  }, [remaining, session]);
  const finished = session?.status === 'running' && remaining === 0;
  const stalePaused = isStalePausedFocus(session, now);
  const mutation = useMutation({
    mutationFn: async (action: 'start' | 'pause' | 'resume' | 'cancel' | 'complete') => {
      if (!token) throw new Error(t('common.connectFirst'));
      if (action === 'start') return startFocus(token, focusSeconds, createIdempotencyKey());
      return controlFocus(
        token,
        session!.id,
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

      if (action === 'start') {
        queryClient.setQueryData(['focus-session'], focus);
        setNow(Date.now());
        await scheduleFocusCompletion(focus.id, focus.planned_seconds);
      } else if (action === 'pause' || action === 'resume' || action === 'cancel') {
        queryClient.setQueryData(['focus-session'], focus);
        setNow(Date.now());

        if (action === 'resume') {
          await scheduleFocusCompletion(focus.id, getRemainingSeconds(focus, Date.now()));
        } else {
          await cancelFocusCompletion(focus.id);
        }
      } else if (action === 'complete') {
        const completed = result as { data: { daily_summary: { points_total: number } } };
        syncTodayPointsWidget(completed.data.daily_summary.points_total);
      }
      await queryClient.invalidateQueries({ queryKey: ['focus-session'] });
    },
  });
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
            : session
              ? t('focus.running')
              : t('focus.default', { minutes: 25 })
        }
        primaryLabel={primary[1]}
        hasSession={Boolean(session)}
        isStalePaused={stalePaused}
        finished={finished}
        isPending={mutation.isPending}
        error={mutation.isError ? mutation.error.message : undefined}
        previewMessage={previewMessage}
        onPrimary={() => token && mutation.mutate(primary[0])}
        onPreview={async () => {
          const shown = await previewFocusCompletion();
          if (!shown) setPreviewMessage(t('focus.previewUnavailable'));
        }}
        onComplete={() => mutation.mutate('complete')}
        onCancel={() => mutation.mutate('cancel')}
      />
    </SafeAreaView>
  );
}
