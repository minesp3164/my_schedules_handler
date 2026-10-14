// 브라우저 Notification API 존재 여부.
export function webNotificationSupported() {
  return 'Notification' in globalThis;
}

// 아직 권한을 묻지 않았다면(기본값) 한 번 요청한다.
export async function ensureWebPermission() {
  if (!webNotificationSupported()) return;
  if (globalThis.Notification.permission === 'default') {
    await globalThis.Notification.requestPermission();
  }
}
