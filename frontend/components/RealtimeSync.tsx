import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { controlFocus, getCurrentFocus, type FocusSession } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { cancelFocusCompletion } from '@/services/focus-notifications';
import { endFocusLiveActivity, updateFocusLiveActivity } from '@/services/focus-live-activity';
import { subscribeToTracker } from '@/services/realtime';

const getRemainingSeconds = (session: FocusSession, now: number) => {
  const elapsed = (now - Date.parse(session.started_at)) / 1_000 - session.paused_seconds;
  return Math.max(session.planned_seconds - elapsed, 0);
};

function FocusBackgroundPause() {
  const queryClient = useQueryClient();
  const pauseInFlight = useRef(false);
  const [token, setToken] = useState<string | null>();
  const current = useQuery({
    queryKey: ['focus-session'],
    queryFn: () => getCurrentFocus(token!),
    enabled: Platform.OS === 'ios' && Boolean(token),
  });

  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);

  useEffect(() => {
    const session = current.data;
    if (session === null) {
      void endFocusLiveActivity();
      return;
    }
    if (session?.status === 'running' && getRemainingSeconds(session, Date.now()) === 0) {
      void endFocusLiveActivity();
    }
  }, [current.data]);

  // 앱이 백그라운드(다른 앱/홈 화면)로 나가면 실행 중인 세션을 일시정지한다.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'background') return;

      const session = queryClient.getQueryData<FocusSession | null>(['focus-session']);
      if (
        Platform.OS !== 'ios' ||
        !token ||
        !session ||
        session.status !== 'running' ||
        pauseInFlight.current
      ) {
        return;
      }

      pauseInFlight.current = true;
      const remainingSeconds = getRemainingSeconds(session, Date.now());
      void controlFocus(token, session.id, 'pause')
        .then(async (result) => {
          const { data } = result as { data: FocusSession };
          queryClient.setQueryData(['focus-session'], data);
          await cancelFocusCompletion(session.id);
          await updateFocusLiveActivity(remainingSeconds, true);
        })
        .finally(() => {
          pauseInFlight.current = false;
          void queryClient.invalidateQueries({ queryKey: ['focus-session'] });
        });
    });
    return () => subscription.remove();
  }, [queryClient, token]);

  return null;
}

export function RealtimeSync() {
  const queryClient = useQueryClient();
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    getDeviceToken().then((token) => {
      if (!token) return;
      unsubscribe = subscribeToTracker(token, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['focus-session'] });
        queryClient.invalidateQueries({ queryKey: ['history'] });
        queryClient.invalidateQueries({ queryKey: ['milestones'] });
        queryClient.invalidateQueries({ queryKey: ['settings'] });
        queryClient.invalidateQueries({ queryKey: ['task-templates'] });
        queryClient.invalidateQueries({ queryKey: ['retro-week'] });
        queryClient.invalidateQueries({ queryKey: ['weekly-retro'] });
      });
    });
    return () => unsubscribe?.();
  }, [queryClient]);
  return <FocusBackgroundPause />;
}
