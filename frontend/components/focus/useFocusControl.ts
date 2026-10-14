import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FocusSession } from '@/services/api';
import { showWebFocusCompletion } from '@/services/focus-notifications';
import { endFocusLiveActivity } from '@/services/focus-live-activity';
import {
  focusSeconds,
  getRemainingSeconds,
  getRemainingSecondsPrecise,
  isStalePausedFocus,
} from '@/services/focus-session';
import {
  createFocusMutationFn,
  createFocusOnMutate,
  createFocusOnSuccess,
} from './focus-mutations';

// 집중 세션 제어: 시각 틱 · 시작/일시정지/재개/완료 뮤테이션 · 라이브 액티비티/알림 연동.
export function useFocusControl(
  token: string | null | undefined,
  session: FocusSession | null | undefined
) {
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
    mutationFn: createFocusMutationFn(token, session, focusSeconds),
    onMutate: createFocusOnMutate(queryClient, setNow),
    onSuccess: createFocusOnSuccess({
      queryClient,
      screenFocused,
      setCompletedKind,
      setJustCompleted,
      setLiveActivityNotice,
      setNow,
      startBreak: () => mutation.mutate('start-break'),
    }),
    onError: (_error, _action, context) => {
      queryClient.setQueryData(['focus-session'], context?.previous ?? null);
      setNow(Date.now());
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

  return {
    remaining,
    progress,
    finished,
    stalePaused,
    justCompleted,
    completedKind,
    liveActivityNotice,
    mutation,
  };
}
