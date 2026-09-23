import NetInfo from '@react-native-community/netinfo';
import { onlineManager, type QueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { flushOfflineQueue } from '@/services/offline-queue';

let online = true;

// 재접속하면 오프라인에서 쌓인 기록을 먼저 재전송하고, 캐시 갱신은 그 위에서 다시 채운다.
export function initNetworkMonitor(queryClient: QueryClient) {
  NetInfo.addEventListener((state) => {
    const connected = state.isConnected !== false;
    const reconnected = connected && !online;
    online = connected;
    onlineManager.setOnline(online);
    if (reconnected) void flushOfflineQueue(queryClient);
  });
  // 앱을 켰을 때 남아 있던 큐를 비운다(오프라인이면 내부에서 재시도를 예약한다).
  void flushOfflineQueue(queryClient);
}

export const isOnline = () => online;

export function useIsOnline() {
  const [value, setValue] = useState(online);
  useEffect(
    () => NetInfo.addEventListener((state) => setValue(state.isConnected !== false)),
    []
  );
  return value;
}
