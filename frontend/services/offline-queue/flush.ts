import type { QueryClient } from '@tanstack/react-query';
import { apiBaseUrl } from '@/services/config';
import { isOnline } from '@/services/network';
import { load, notify, persist, type QueuedRequest, type QueueState } from './store';

// 실패 항목은 5회(약 5분 백오프) 재시도 후 제거하고 배지로 알린다.
const MAX_ATTEMPTS = 5;
export const BACKOFFS = [5_000, 15_000, 60_000, 300_000];
const OFFLINE_POLL_MS = 30_000;

let flushing = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let activeClient: QueryClient | null = null;

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

// 순서가 중요한 연쇄 요청이므로 아직 이르면 대기 시간을, 지났으면 null 을 준다.
function delayUntilReady(entry: QueuedRequest): number | null {
  const wait = entry.nextAt - Date.now();
  return wait > 0 ? wait : null;
}

// 임시 id 로 만든 경로를 매핑된 서버 id 로 재작성한다.
function resolvePath(path: string, resolved: Record<string, string>) {
  let result = path;
  for (const [tempId, realId] of Object.entries(resolved)) {
    if (result.includes(tempId)) result = result.split(tempId).join(realId);
  }
  return result;
}

// 재전송 성공 시 응답 본문에서 실제 id 를 뽑아 매핑에 남긴다.
async function captureResolvedId(entry: QueuedRequest, response: Response, current: QueueState) {
  if (!entry.resolves) return;
  try {
    const payload = response.status === 204 ? null : await response.json();
    const realId = payload?.data?.id;
    if (typeof realId === 'string') current.resolved[entry.resolves] = realId;
  } catch {
    // 본문이 없으면 매핑만 건너뛴다.
  }
}

// 재시도 횟수를 늘리고, 한도면 항목을 제거하며, 아니면 지수 백오프로 미룬다.
function failEntry(entry: QueuedRequest, current: QueueState): 'break' | 'continue' {
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) {
    current.entries = current.entries.filter((queued) => queued.id !== entry.id);
    current.failedCount += 1;
    return 'continue';
  }
  entry.nextAt = Date.now() + BACKOFFS[Math.min(entry.attempts - 1, BACKOFFS.length - 1)];
  scheduleOfflineFlush(entry.nextAt - Date.now());
  return 'break';
}

type SendOutcome = 'ok' | 'rejected' | 'offline';

async function sendEntry(
  entry: QueuedRequest,
  path: string,
  current: QueueState
): Promise<SendOutcome> {
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
      await captureResolvedId(entry, response, current);
      return 'ok';
    }
    return 'rejected';
  } catch {
    return isOnline() ? 'rejected' : 'offline';
  }
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
      const delay = delayUntilReady(entry);
      if (delay !== null) {
        scheduleOfflineFlush(delay);
        break;
      }
      if (!isOnline()) {
        scheduleOfflineFlush(OFFLINE_POLL_MS);
        break;
      }
      const outcome = await sendEntry(entry, resolvePath(entry.path, current.resolved), current);
      if (outcome === 'ok') {
        current.entries = current.entries.filter((queued) => queued.id !== entry.id);
        changed = true;
        succeeded = true;
        continue;
      }
      if (outcome === 'offline') {
        scheduleOfflineFlush(OFFLINE_POLL_MS);
        break;
      }
      changed = true;
      if (failEntry(entry, current) === 'break') break;
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
