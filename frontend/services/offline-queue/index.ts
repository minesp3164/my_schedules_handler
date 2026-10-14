import { useEffect, useState } from 'react';
import { createUuid } from '@/services/ids';
import { BACKOFFS, scheduleOfflineFlush } from './flush';
import {
  load,
  notify,
  persist,
  stats,
  subscribeOfflineQueue,
  type OfflineQueueStats,
} from './store';

export * from './store';
export * from './flush';

export async function enqueueOfflineRequest(request: {
  method: string;
  path: string;
  body: string | null;
  headers: Record<string, string>;
  token: string;
  resolves?: string;
}) {
  const current = await load();
  current.entries.push({
    ...request,
    id: createUuid(),
    attempts: 0,
    nextAt: 0,
    enqueuedAt: Date.now(),
  });
  // 남은 항목의 경로에서 더 이상 쓰이지 않는 임시 id 매핑은 버린다.
  for (const key of Object.keys(current.resolved)) {
    if (!current.entries.some((entry) => entry.path.includes(key))) delete current.resolved[key];
  }
  await persist();
  notify();
  scheduleOfflineFlush(BACKOFFS[0]);
}

// 배너용 훅: 대기 건수와 전송 실패 건수를 구독한다.
export function useOfflineQueueStats(): OfflineQueueStats {
  const [value, setValue] = useState<OfflineQueueStats>(stats);
  useEffect(() => {
    const unsubscribe = subscribeOfflineQueue(() => setValue(stats()));
    load().then(() => setValue(stats()));
    return unsubscribe;
  }, []);
  return value;
}
