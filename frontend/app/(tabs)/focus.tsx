import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { getCurrentFocus, getSettings } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import { formatTime } from '@/services/focus-session';
import { FocusSessionPanel } from '@/components/focus/FocusSessionPanel';
import { useFocusControl } from '@/components/focus/useFocusControl';

export default function Focus() {
  const [token, setToken] = useState<string | null>();
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
  const session = current.data;
  const {
    remaining,
    progress,
    finished,
    stalePaused,
    justCompleted,
    completedKind,
    liveActivityNotice,
    mutation,
  } = useFocusControl(token, session);
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
