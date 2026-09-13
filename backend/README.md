# 백엔드 설계 — 취준 리워드 트래커

이 폴더는 React Native/웹 클라이언트와 분리된 Rails API 서버의 루트다.

> 현재 상태: Task MVP, 기기 인증, 집중 타이머, 대시보드·히스토리, 개인 설정, 리워드 엔진, 실시간 동기화, 푸시·13시 재촉 작업까지 구현되어 있다. 운영 배포는 다음 단계다.

## 1. 역할과 경계

Rails는 다음만 담당한다.

- 기기별 자동 등록과 토큰 관리
- 할 일 완료, 타이머 완료, 보너스의 트랜잭션 처리
- SQLite를 기준으로 한 점수·보상·일일 집계
- 웹·앱 간 실시간 동기화(Action Cable)
- 타이머 종료·보상·13시 재촉 푸시의 예약과 발송

클라이언트는 화면 상태와 타이머의 초 단위 표시만 담당한다. 점수 계산·보상 판정·중복 방지는 클라이언트가 아닌 서버에서만 처리한다.

## 2. 권장 기반

| 영역 | 선택 |
| --- | --- |
| 런타임 | Ruby 3.3+, Rails 8 API mode |
| DB | SQLite 3, WAL mode, 영속 볼륨 |
| 비동기 작업 | Solid Queue + Rails recurring tasks |
| 실시간 | Action Cable |
| 인증 | 자동 등록으로 발급하는 기기 토큰 |
| 앱 푸시 | Expo Push API |
| 웹 푸시 | Web Push + VAPID |
| 테스트 | RSpec 또는 Rails 기본 테스트 중 한 가지로 통일 |

## 3. 생성될 폴더 구조

```text
backend/
├── app/
│   ├── channels/
│   │   └── tracker_channel.rb
│   ├── controllers/api/v1/
│   │   ├── base_controller.rb
│   │   ├── devices_controller.rb
│   │   ├── dashboard_controller.rb
│   │   ├── task_completions_controller.rb
│   │   ├── focus_sessions_controller.rb
│   │   ├── histories_controller.rb
│   │   ├── settings_controller.rb
│   │   └── push_subscriptions_controller.rb
│   ├── jobs/
│   │   ├── send_push_notification_job.rb
│   │   └── send_daily_nudge_job.rb
│   ├── models/
│   │   ├── device.rb
│   │   ├── task_template.rb
│   │   ├── daily_task_completion.rb
│   │   ├── focus_session.rb
│   │   ├── point_event.rb
│   │   ├── daily_summary.rb
│   │   ├── reward_rule.rb
│   │   ├── reward_achievement.rb
│   │   ├── notification_delivery.rb
│   │   └── setting.rb
│   └── services/
│       ├── devices/activate.rb
│       ├── tasks/complete.rb
│       ├── tasks/revert.rb
│       ├── focus_sessions/complete.rb
│       ├── points/recalculate_daily_summary.rb
│       ├── rewards/evaluate.rb
│       └── notifications/deliver.rb
├── config/
│   ├── routes.rb
│   ├── cable.yml
│   └── recurring.yml
├── db/
│   ├── migrate/
│   └── seeds.rb
└── spec/ 또는 test/
```

## 4. 데이터 모델 책임

ERD의 상세 컬럼과 제약은 상위 [erd.md](../erd.md)에 둔다.

| 모델 | 책임 |
| --- | --- |
| `Device` | 설치된 웹/앱 기기와 토큰·푸시 구독 관리 |
| `TaskTemplate` | 매일 보여줄 사용자 정의 할 일 |
| `DailyTaskCompletion` | 특정 날짜의 할 일 완료 횟수 |
| `FocusSession` | 타이머 시작·완료·취소 기록 |
| `PointEvent` | 모든 점수 변동의 변경 불가능한 원장 |
| `DailySummary` | 홈 화면을 빠르게 조회하는 날짜별 집계 캐시 |
| `RewardRule` | 일간/주간 보상 기준과 문구 |
| `RewardAchievement` | 기간별 보상 달성의 단 한 번 기록 |
| `NotificationDelivery` | 기기별 알림 발송·실패 이력과 중복 방지 |
| `Setting` | 단일 사용자 설정(타이머·포인트·13시 알림·시간대) |

## 5. API 설계

모든 경로는 `/api/v1`로 시작한다. 모든 변경 요청은 `Authorization: Bearer <device-token>`을 요구한다. 클라이언트가 보내는 변경 요청은 `Idempotency-Key` 헤더를 항상 포함한다.

| 메서드 | 경로 | 요청 핵심 | 응답 핵심 |
| --- | --- | --- | --- |
| POST | `/devices/activate` | `installation_id`, `platform`, `name` | 기기 토큰, device |
| DELETE | `/devices/current` | 현재 기기 토큰 | 기기 연결 해제·토큰 무효화 |
| GET | `/dashboard?date=YYYY-MM-DD` | 날짜 선택 | 오늘 할 일, 점수, 보상 진행도, 요약 |
| POST | `/tasks/:task_template_id/completions` | `idempotency_key` | completion, point_event, dashboard revision |
| DELETE | `/completions/:id` | `idempotency_key` | 취소된 completion, 음수 point_event |
| POST | `/focus-sessions` | `started_at`, `planned_seconds` | running session |
| PATCH | `/focus-sessions/:id` | `status`, `ended_at`, `idempotency_key` | session, 완료 point_event |
| GET | `/history?from=&to=` | 날짜 범위 | 날짜별 summary와 event 목록 |
| GET/PATCH | `/settings` | 개인 설정 | settings |
| POST | `/push-subscriptions` | Expo token 또는 Web Push subscription | 갱신된 device |

### 공통 응답 형식

```json
{
  "data": {},
  "meta": { "revision": 42, "server_time": "2026-09-11T04:00:00Z" }
}
```

오류는 `{ "error": { "code": "target_already_met", "message": "오늘 목표 횟수를 이미 채웠어요." } }` 형식으로 반환한다.

## 6. 핵심 서비스 트랜잭션

### 할 일 완료: `Tasks::Complete`

1. 기기 토큰과 `Idempotency-Key`를 검증한다.
2. 해당 `TaskTemplate`과 오늘의 유효 완료 수를 SQLite 트랜잭션 안에서 잠근다.
3. `target_count`를 초과하면 `409 target_already_met`을 반환한다.
4. `DailyTaskCompletion`을 만든다.
5. 당시 점수로 `PointEvent(event_type: task_completion)`를 만든다.
6. `DailySummary`를 원장에서 다시 계산한다.
7. 전체 목표가 처음 충족되었다면 `PointEvent(event_type: daily_bonus)`를 추가한다.
8. `Rewards::Evaluate`가 보상 달성 레코드를 unique 제약으로 생성한다.
9. 커밋 뒤에 Action Cable 방송과 알림 작업을 큐에 넣는다.

### 타이머 완료: `FocusSessions::Complete`

- `ended_at - started_at`이 최소 완료 기준(예: 계획 시간의 80%)을 만족할 때만 완료 포인트를 준다.
- 완료 포인트는 `PointEvent(event_type: focus_completion)`로 한 번만 남긴다.
- 취소된 세션에는 점수를 주지 않는다.
- 타이머 시작 시에는 `DailySummary.first_activity_at`만 기록하므로, 13시 재촉 알림은 막되 포인트는 생기지 않는다.

### 완료 취소: `Tasks::Revert`

- 원본 완료는 `reverted_at`만 기록한다. 삭제하지 않는다.
- 원본 `PointEvent`는 `reversed_at`을 갱신하고, 집계를 다시 계산한다.
- 이후 전체 완료 조건이 사라져도 과거 보상 알림을 취소하지 않는다. 다만 점수·진행도 표시는 현재 상태로 내려간다.

## 7. 실시간 동기화

- 인증된 기기는 `TrackerChannel`을 구독한다.
- 변경이 커밋된 뒤 서버가 `dashboard.updated`, `task.completed`, `task.reverted`, `focus.completed`, `reward.achieved`, `settings.updated`를 방송한다.
- 이벤트는 `revision`을 포함한다. 클라이언트는 빠진 revision이나 재연결이 감지되면 `/dashboard`를 다시 조회한다.
- WebSocket은 즉시성 용도다. 복구와 정확성은 REST API 재조회가 보장한다.

## 8. 알림 작업

### 타이머 종료와 보상

- 타이머 종료 및 보상 달성 직후 `SendPushNotificationJob`을 넣는다.
- 등록된 각 기기에 `NotificationDelivery`를 먼저 unique 키로 생성한 뒤 실제 푸시를 보낸다.
- 같은 기기가 웹과 앱 모두라면 활성 기기 우선으로 한 채널만 보낸다.

### 13시 재촉

- `config/recurring.yml`에서 매분 `SendDailyNudgeJob`을 실행한다.
- 작업은 `Asia/Seoul` 기준 13:00에만 처리하며 `Setting.nudge_enabled`와 `DailySummary.first_activity_at`을 검사한다.
- 활동이 없는 기기에만 `notification_type: daily_nudge`, `schedule_key: YYYY-MM-DD`로 발송한다.

## 9. 보안과 운영

- `.env`는 커밋하지 않는다. `RAILS_MASTER_KEY`, VAPID 키, Expo 설정은 서버 환경 변수 또는 Rails credentials에 둔다.
- 기기 토큰은 DB에 해시로 저장하고, 원문은 발급 순간 한 번만 반환한다.
- CORS는 웹 PWA 도메인만 허용한다.
- SQLite는 WAL 모드·foreign keys 활성화·매일 백업을 사용한다. 단일 서버와 영속 볼륨이 전제다.
- `/up` 헬스 체크와 작업 큐 상태 점검을 제공한다.

## 10. 구현 순서

1. Rails API 프로젝트 생성, SQLite 설정, 마이그레이션, seed 데이터. ✅
2. 기기 활성화와 인증 미들웨어. ✅
3. 할 일 완료·점수 원장·취소 API, 트랜잭션 테스트. ✅
4. 타이머 세션 시작·일시정지·재개·완료·취소 API. ✅
5. 대시보드·히스토리 조회 API. ✅
6. 개인 설정 API(타이머·포인트·재촉·보상 기준). ✅
7. 리워드 엔진(일일·주간 달성, 기간별 중복 방지). ✅
8. Action Cable과 다중 기기 동기화. ✅
9. Expo/Web Push와 13시 재촉 반복 작업. ✅
10. HTTPS 배포, 영속 SQLite 백업, 실제 기기 알림 검증.

## 로컬 실행

```bash
bundle install
bin/rails db:prepare
bin/rails server
```

개발 데이터는 `bin/rails db:seed`로 만든다. 로컬 Task API를 확인할 때만 `Authorization: Bearer development-token`을 사용한다. 이 토큰은 개발 전용이므로 실제 배포에서는 기기 활성화 API가 발급한 토큰으로 교체한다.

새 기기는 첫 실행 시 `POST /api/v1/devices/activate`에 `installation_id`, `name`, `platform`을 전송해 자동 등록된다. 반환된 `access_token`은 그 응답에서만 보이며, 이후 모든 보호된 API에 `Authorization: Bearer <access_token>`으로 전송한다.
