# 푸시 알림

`POST /api/v1/push_subscription`으로 현재 기기의 Expo 토큰 또는 Web Push 구독 정보를 저장한다.

- 앱: `push_subscription.expo_push_token`
- 웹: `push_subscription.web_push_subscription.endpoint`, `keys.p256dh`, `keys.auth`

운영 환경에서는 `bin/jobs`를 함께 실행한다. Solid Queue가 매분 `SendDailyNudgeJob`을 넣고, 작업은 한국 시간 설정값(기본 13:00)에만 실행된다. 당일 첫 활동이 있거나 같은 기기에 이미 발송된 기록이 있으면 보내지 않는다.

필수 환경 변수는 `.env.example`의 `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`이며, Expo 액세스 토큰은 선택 사항이다.
