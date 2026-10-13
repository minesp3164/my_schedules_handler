// API 기본 주소. 오프라인 큐와 API 클라이언트가 공유해 순환 참조를 막는다.
export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.200.104:3000/api/v1';
