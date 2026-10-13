import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { apiBaseUrl } from '@/services/config';
import { createUuid } from '@/services/ids';
import { isOnline } from '@/services/network';

const STORAGE_KEY = 'offline-queue:v1';
// 실패 항목은 5회(약 5분 백오프) 재시도 후 제거하고 배지로 알린다.
const MAX_ATTEMPTS = 5;
const BACKOFFS = [5_000, 15_000, 60_000, 300_000];
const OFFLINE_POLL_MS = 30_000;

export type QueuedRequest = {
  id: string;
  method: string;
  path: string;
  body: string | null;
  headers: Record<string, string>;
  token: string;
  /** 집중 세션처럼 서버 id 가 필요한 연쇄 요청의 임시 id. 재전송 성공 시 실제 id 로 갱신한다. */
  resolves?: string;
  attempts: number;
  nextAt: number;
  enqueuedAt: number;
};

type QueueState = {
  entries: QueuedRequest[];
  /** 임시 id(pending:*) → 서버 id 매핑. 후속 요청의 경로를 재작성하는 데 쓴다. */
  resolved: Record<string, string>;
  failedCount: number;
};

const emptyState = (): QueueState => ({ entries: [], resolved: {}, failedCount: 0 });

// 웹은 localStorage, 네이티브는 AsyncStorage. 모듈 누락·저장 실패는 큐만 꺼놓는다.
const storage = {
  async get(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return window.localStorage.getItem(STORAGE_KEY);
      return await AsyncStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  },
  async set(value: string) {
    try {
      if (Platform.OS === 'web') window.localStorage.setItem(STORAGE_KEY, value);
      else await AsyncStorage.setItem(STORAGE_KEY, value);
    } catch {
      // 저장이 불가능하면 큐를 포기하고 기존 오프라인 안내로 되돌린다.
    }
  },
};

let state: QueueState | null = null;
let loading: Promise<QueueState> | null = null;
let flushing = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let activeClient: QueryClient | null = null;
const listeners = new Set<() => void>();

async function load(): Promise<QueueState> {
  if (state) return state;
  if (!loading) {
    loading = (async () => {
      const raw = await storage.get();
      let parsed = emptyState();
      if (raw) {
        try {
          parsed = { ...emptyState(), ...JSON.parse(raw) };
        } catch {
          // 깨진 값은 버린다.
        }
      }
      state = parsed;
      return parsed;
    })();
  }
  return loading;
}

async function persist() {
  if (state) await storage.set(JSON.stringify(state));
}

function notify() {
  listeners.forEach((listener) => listener());
}

export type OfflineQueueStats = { pending: number; failedCount: number };

function stats(): OfflineQueueStats {
  return { pending: state?.entries.length ?? 0, failedCount: state?.failedCount ?? 0 };
}

export function subscribeOfflineQueue(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
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

export async function dismissOfflineFailures() {
  const current = await load();
  if (!current.failedCount) return;
  current.failedCount = 0;
  await persist();
  notify();
}

export function scheduleOfflineFlush(delayMs: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(
    () => {
      timer = null;
      void flushOfflineQueue();
    },
    Math.max(delayMs, 0)
  );
}

/**
 * 대기 중인 기록을 순서대로 재전송한다.
 * - 네트워크 단절은 지수 백오프로 재시도하고, 계속 실패하면 항목을 제거해 배지로 알린다.
 * - 임시 id 로 만든 항목(집중 시작)의 실제 id 는 성공 응답에서 받아 뒤 항목 경로에 반영한다.
 */
export async function flushOfflineQueue(queryClient?: QueryClient): Promise<void> {
  if (queryClient) activeClient = queryClient;
  if (flushing) return;
  const current = await load();
  if (!current.entries.length) return;
  if (!isOnline()) {
    // 재접속 이벤트를 기다리면서 주기적으로 확인만 한다.
    scheduleOfflineFlush(OFFLINE_POLL_MS);
    return;
  }
  flushing = true;
  let changed = false;
  let succeeded = false;
  try {
    for (const entry of [...current.entries]) {
      if (Date.now() < entry.nextAt) {
        // 순서가 중요한 연쇄 요청이므로 뒤 항목은 앞이 성공할 때까지 기다린다.
        scheduleOfflineFlush(entry.nextAt - Date.now());
        break;
      }
      if (!isOnline()) {
        scheduleOfflineFlush(OFFLINE_POLL_MS);
        break;
      }
      let path = entry.path;
      for (const [tempId, realId] of Object.entries(current.resolved)) {
        if (path.includes(tempId)) path = path.split(tempId).join(realId);
      }
      const fail = (): 'break' | 'continue' => {
        entry.attempts += 1;
        if (entry.attempts >= MAX_ATTEMPTS) {
          current.entries = current.entries.filter((queued) => queued.id !== entry.id);
          current.failedCount += 1;
          changed = true;
          return 'continue';
        }
        entry.nextAt = Date.now() + BACKOFFS[Math.min(entry.attempts - 1, BACKOFFS.length - 1)];
        changed = true;
        scheduleOfflineFlush(entry.nextAt - Date.now());
        return 'break';
      };
      try {
        const response = await fetch(`${apiBaseUrl}${path}`, {
          method: entry.method,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${entry.token}`,
            'ngrok-skip-browser-warning': '1',
            ...entry.headers,
          },
          body: entry.body ?? undefined,
        });
        if (response.ok) {
          if (entry.resolves) {
            try {
              const payload = response.status === 204 ? null : await response.json();
              const realId = payload?.data?.id;
              if (typeof realId === 'string') current.resolved[entry.resolves] = realId;
            } catch {
              // 본문이 없으면 매핑만 건너뛴다.
            }
          }
          current.entries = current.entries.filter((queued) => queued.id !== entry.id);
          changed = true;
          succeeded = true;
          continue;
        }
        if (fail() === 'break') break;
      } catch {
        if (!isOnline()) {
          scheduleOfflineFlush(OFFLINE_POLL_MS);
          break;
        }
        if (fail() === 'break') break;
      }
    }
  } finally {
    flushing = false;
  }
  if (changed) {
    await persist();
    notify();
  }
  // 재전송에 성공했을 때만 캐시를 다시 불러와 낙관 반영분을 서버 값으로 정리한다.
  if (succeeded) await activeClient?.invalidateQueries();
}
