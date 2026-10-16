const cacheName = 'reward-tracker-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // API 는 크로스 오리진이므로 캐시로 대체하지 않는다.
  // 실패한 JSON 요청에 HTML 캐시가 돌아가면 "Unexpected token '<'" 파싱 오류가 난다.
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          caches.open(cacheName).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      })
      // 오프라인에서는 같은 요청의 캐시만, 내비게이션이면 인덱스 캐시를 돌려준다.
      .catch(() =>
        caches
          .match(event.request)
          .then(
            (cached) =>
              cached ?? (event.request.mode === 'navigate' ? caches.match('/') : Response.error())
          )
      )
  );
});

self.addEventListener('push', (event) => {
  const payload = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'REWARD TRACKER', {
      body: payload.body ?? '새로운 알림이 있어요.',
      data: payload.data ?? {},
    })
  );
});
