import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getDeviceToken } from '@/services/device-token';
import { subscribeToTracker } from '@/services/realtime';

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
        queryClient.invalidateQueries({ queryKey: ['settings'] });
        queryClient.invalidateQueries({ queryKey: ['task-templates'] });
      });
    });
    return () => unsubscribe?.();
  }, [queryClient]);
  return null;
}
