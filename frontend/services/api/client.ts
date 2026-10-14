import { apiBaseUrl } from '@/services/config';
import { t } from '@/services/i18n';
import { createUuid } from '@/services/ids';
import { isOnline } from '@/services/network';
import { enqueueOfflineRequest } from '@/services/offline-queue';

export type ApiResponse<T> = { data: T };

// ngrok 무료판은 브라우저 User-Agent에 경고 페이지를 반환한다. 이 헤더로 우회한다.
export const NGROK_SKIP_HEADER = { 'ngrok-skip-browser-warning': '1' } as const;

// 쓰기 요청은 오프라인이거나 전송 중 연결이 끊기면 로컬 큐에 보존하고 재접속 시 재전송한다.
// optimistic 은 큐에 적재될 때 돌려줄 낙관 응답, resolves 는 서버 id 로 갱신할 임시 id 다.
export type QueuableRequestInit = RequestInit & {
  optimistic?: () => unknown;
  resolves?: string;
  queueable?: boolean;
};

export async function request<T>(path: string, token: string, init?: QueuableRequestInit) {
  const { optimistic, resolves, queueable = true, ...fetchInit } = init ?? {};
  const method = (fetchInit.method ?? 'GET').toUpperCase();
  const shouldQueue = method !== 'GET' && queueable;
  const preserve = async (): Promise<T> => {
    await enqueueOfflineRequest({
      method,
      path,
      body: (fetchInit.body as string | null) ?? null,
      headers: (fetchInit.headers ?? {}) as Record<string, string>,
      token,
      resolves,
    });
    return optimistic?.() as T;
  };
  if (!isOnline()) {
    if (shouldQueue) return preserve();
    throw new Error(t('common.offlineWrite'));
  }
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...fetchInit,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...NGROK_SKIP_HEADER,
        ...fetchInit.headers,
      },
    });
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      const error = new Error(body?.error?.message ?? t('common.requestFailed')) as Error & {
        code?: string;
      };
      error.code = body?.error?.code;
      throw error;
    }
    return body as T;
  } catch (error) {
    // 서버가 응답한 오류가 아니라 전송 자체가 끊긴 경우(TypeError)만 큐에 남긴다.
    if (shouldQueue && error instanceof TypeError) return preserve();
    throw error;
  }
}

export function createIdempotencyKey() {
  return createUuid();
}
