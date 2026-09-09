# 실시간 동기화

웹과 앱은 REST API를 서버 기준 데이터로 사용하고, Action Cable은 변경 사실을 빠르게 알리는 용도로만 쓴다. 이벤트를 받거나 재연결했을 때 클라이언트는 `/api/v1/dashboard`를 다시 조회한다.

## 연결

HTTPS 배포 뒤에는 아래처럼 WSS로 연결한다. 기기 활성화에서 받은 토큰을 `token` 쿼리 값으로 전달한다. 브라우저 WebSocket API는 임의 인증 헤더를 지원하지 않으므로 이 방식으로 인증하며, 토큰은 반드시 HTTPS/WSS 연결에서만 사용한다.

```text
wss://<api-host>/cable?token=<device-access-token>
```

연결 후 `TrackerChannel`을 구독한다.

```json
{"command":"subscribe","identifier":"{\"channel\":\"TrackerChannel\"}"}
```

## 수신 이벤트

```json
{
  "event": "task.completed",
  "revision": 14,
  "occurred_at": "2026-09-11T04:00:00Z",
  "data": { "task_template_id": "…", "completion_id": "…" }
}
```

- 이벤트: `task.completed`, `task.reverted`, `focus.completed`, `settings.updated`, `dashboard.updated`
- `revision`은 전체 변경 순번이다. 이전보다 큰 순번을 받으면 대시보드 캐시를 무효화한다.
- 순번이 건너뛰거나 재연결한 경우에도 `/api/v1/dashboard` 재조회로 복구한다.
