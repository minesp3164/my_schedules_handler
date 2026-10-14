import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'offline-queue:v1';

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

export type QueueState = {
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
const listeners = new Set<() => void>();

export async function load(): Promise<QueueState> {
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

export async function persist() {
  if (state) await storage.set(JSON.stringify(state));
}

export function notify() {
  listeners.forEach((listener) => listener());
}

export type OfflineQueueStats = { pending: number; failedCount: number };

export function stats(): OfflineQueueStats {
  return { pending: state?.entries.length ?? 0, failedCount: state?.failedCount ?? 0 };
}

export function subscribeOfflineQueue(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function dismissOfflineFailures() {
  const current = await load();
  if (!current.failedCount) return;
  current.failedCount = 0;
  await persist();
  notify();
}
