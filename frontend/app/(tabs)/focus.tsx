import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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

const focusSeconds = 25 * 60;
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
      <View className="flex-1 justify-center px-5">
        <Text className="text-center text-2xl font-bold text-[#173052]">{t('focus.title')}</Text>
        <Text className="mt-2 text-center text-sm text-muted">{t('focus.description')}</Text>
        <View className="my-10 h-64 w-64 items-center justify-center self-center rounded-full border-[14px] border-lavender bg-surface">
          <Text className="text-5xl font-bold text-[#173052]">{formatTime(remaining)}</Text>
          <Text className="mt-2 text-sm text-muted">
            {session?.status === 'paused'
              ? t('focus.paused')
              : session
                ? t('focus.running')
                : t('focus.default')}
          </Text>
        </View>
        {mutation.isError ? (
          <Text className="mb-3 text-center text-sm text-[#FF9BA6]">{mutation.error.message}</Text>
        ) : null}
        {finished ? (
          <Text className="mb-3 rounded-xl bg-[#DCEEFF] px-4 py-3 text-center text-sm font-semibold text-lavender">
            {t('focus.finished')}
          </Text>
        ) : null}
        <Pressable
          disabled={mutation.isPending}
          onPress={() => {
            if (token) mutation.mutate(primary[0]);
          }}
          style={{ backgroundColor: palette.accent }}
          className="items-center rounded-[14px] bg-lavender py-4 transition duration-150 hover:-translate-y-px hover:opacity-90 disabled:opacity-50">
          <Text className="font-bold text-white">{primary[1]}</Text>
        </Pressable>
        <Pressable
          onPress={async () => {
            const shown = await previewFocusCompletion();
            if (!shown) setPreviewMessage(t('focus.previewUnavailable'));
          }}
          className="mt-3 items-center rounded-[14px] border border-line py-3 transition duration-150 hover:-translate-y-px hover:bg-surface">
          <Text className="font-semibold text-muted">{t('focus.preview')}</Text>
        </Pressable>
        {previewMessage ? (
          <Text className="mt-2 text-center text-xs text-muted">{previewMessage}</Text>
        ) : null}
        {session ? (
          <View className="mt-3 flex-row gap-3">
            <Pressable
              disabled={mutation.isPending}
              onPress={() => mutation.mutate('complete')}
              className="flex-1 items-center rounded-[14px] bg-success py-4 transition duration-150 hover:-translate-y-px hover:opacity-90">
              <Text className="font-bold text-white">{t('focus.complete')}</Text>
            </Pressable>
            <Pressable
              disabled={mutation.isPending}
              onPress={() => mutation.mutate('cancel')}
              className="flex-1 items-center rounded-[14px] border border-line py-4 transition duration-150 hover:-translate-y-px hover:bg-surface">
              <Text className="font-bold text-muted">{t('focus.cancel')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
