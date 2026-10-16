# 백엔드 설계 — 취준 리워드 트래커

이 폴더는 React Native/웹 클라이언트와 분리된 Rails API 서버의 루트다.

> 현재 상태: Task MVP, 기기 인증, 집중 타이머, 대시보드·히스토리, 개인 설정, 리워드 엔진, 실시간 동기화, 푸시·13시 재촉 작업, 마일스톤·배지 시스템(규칙·달성·축하·발자국)까지 구현되어 있다. 운영 배포는 다음 단계다.

## 1. 역할과 경계

Rails는 다음만 담당한다.

- 기기별 자동 등록과 토큰 관리
- 할 일 완료, 타이머 완료, 보너스의 트랜잭션 처리
- 회사별 지원 단계 기록과 그에 따른 포인트·할 일 완료 자동 생성
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
│   │   ├── milestones_controller.rb
│   │   ├── badges_controller.rb
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
│   │   ├── badge_rule.rb
│   │   ├── badge_achievement.rb
│   │   └── setting.rb
│   └── services/
│       ├── devices/activate.rb
│       ├── tasks/complete.rb
│       ├── tasks/revert.rb
│       ├── focus_sessions/complete.rb
│       ├── points/recalculate_daily_summary.rb
│       ├── rewards/evaluate.rb
│       ├── badges/sync_default_rules.rb
│       ├── badges/evaluate.rb
│       ├── milestones/progress.rb
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
| `BadgeRule` | 전역 배지 규칙(카테고리·지표·임계값·표시 문구, 코드 기본값 63종) |
| `BadgeAchievement` | 사용자별 배지 달성 기록(지표가 기준 미달이 되면 회수) |
| `NotificationDelivery` | 기기별 알림 발송·실패 이력과 중복 방지 |
| `Setting` | 단일 사용자 설정(타이머·포인트·13시 알림·시간대) |
| `Application` | 회사별 지원 건과 종결 상태(active/rejected/withdrawn/accepted) |
| `ApplicationStage` | 사용자 정의 단계(이름·순서는 자유, 포인트는 kind별 고정) |
| `ApplicationStageEvent` | 단계 완료 기록. 지원 포인트의 유일한 근거이자 단계당 1회 제약의 주체 |

## 5. API 설계

모든 경로는 `/api/v1`로 시작한다. 모든 변경 요청은 `Authorization: Bearer <device-token>`을 요구한다. 클라이언트가 보내는 변경 요청은 `Idempotency-Key` 헤더를 항상 포함한다.

| 메서드 | 경로 | 요청 핵심 | 응답 핵심 |
| --- | --- | --- | --- |
| POST | `/devices/activate` | `installation_id`, `platform`, `name`, `access_key` | 기기 토큰, device |
| DELETE | `/devices/current` | 현재 기기 토큰 | 기기 연결 해제·토큰 무효화 |
| POST | `/realtime-tickets` | 현재 기기 토큰 | Cable 접속용 단기 ticket |
| GET | `/dashboard?date=YYYY-MM-DD` | 날짜 선택 | 오늘 할 일, 점수, 보상 진행도, 요약 |
| POST | `/tasks/:task_template_id/completions` | `idempotency_key` | completion, point_event, dashboard revision |
| DELETE | `/completions/:id` | `idempotency_key` | 취소된 completion, 음수 point_event |
| GET | `/applications` | - | 지원 건 목록 + 활성 단계 목록(첫 호출 시 기본 단계 생성) |
| POST | `/applications` | `application[company]` 등 | 지원 건 추가(진행 중 회사 중복은 422) |
| PATCH | `/applications/:id` | `application[status]`(rejected/withdrawn) | 종결 처리, closed_at |
| GET | `/application-stages` | - | 단계 목록(kind별 고정 points 포함) |
| POST | `/application-stages` | `application_stage[name, kind]` | 단계 추가 |
| PATCH | `/application-stages/:id` | `application_stage[name, position]` | 단계 이름·순서 수정 |
| DELETE | `/application-stages/:id` | - | 단계 비활성화(마지막 활성 단계는 422) |
| POST | `/applications/:id/stage-events` | `stage_event[application_stage_id]`, `Idempotency-Key` | 단계 기록, application_milestone point_event, 제출 시 할 일 완료 자동 생성 |
| DELETE | `/stage-events/:id` | - | 단계 기록 취소(자동 완료·포인트 회수 동반) |
| POST | `/focus-sessions` | `started_at`, `planned_seconds` | running session |
| PATCH | `/focus-sessions/:id` | `status`, `ended_at`, `idempotency_key` | session, 완료 point_event |
| GET | `/history?from=&to=` | 날짜 범위 | 날짜별 summary, event, **리캡**(목표 진척·이월 목록) |
| POST | `/task-deferrals` | `task_template_id`, `Idempotency-Key` | 회복 패스 1개로 할 일 하나를 내일로 이월 |
| DELETE | `/task-deferrals/:id` | - | 이월 되돌리기(회복 패스 복구, 당일만) |
| GET/PATCH | `/settings` | 개인 설정 | settings |
| POST | `/push-subscriptions` | Expo token 또는 Web Push subscription | 갱신된 device |
| GET | `/reward-unlocks` | - | 5종 보상 해금 상태(주간/누적/보유 단위별 progress·available) |
| GET | `/reward-redemptions` | - | 보상 기록 목록(status: unlocked/redeemed/skipped) |
| POST | `/reward-redemptions` | `reward_kind`, `payload`, `Idempotency-Key` | 해금형 보상 기록. 포인트 차감 없음(reflection만 300점 구매) |
| PATCH | `/reward-redemptions/:id` | `status`(unlocked↔skipped) | 회복 패스 보유/나중에 하기 전이 |
| GET | `/milestones` | - | 지표 8종(활동일·집중분·완료/생성 건수·앱/알고리즘/포트폴리오 완주·첫 활동일) |
| GET | `/badges` | - | 배지 전체(획득 시각 포함)와 미달성 진행도. **조회 시점에 달성 평가** 수행 |

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
9. 같은 트랜잭션 뒤에서 `Badges::Evaluate`가 미달성 배지를 채운다.
10. 커밋 뒤에 Action Cable 방송과 알림 작업을 큐에 넣는다.

- `kind: application`(이력서 지원)은 회사명 `note`가 없으면 `422 note_required`로 거절한다. `kind: research`(기업 리서치)는 조사 활동이라 회사명 없이 완료된다.

### 타이머 완료: `FocusSessions::Complete`

- `ended_at - started_at`이 최소 완료 기준(예: 계획 시간의 80%)을 만족할 때만 완료 포인트를 준다.
- 완료 포인트는 `PointEvent(event_type: focus_completion)`로 한 번만 남긴다.
- 트랜잭션 안에서 Rewards 뒤에 `Badges::Evaluate`를 호출한다.
- 취소된 세션에는 점수를 주지 않는다.
- 타이머 시작 시에는 `DailySummary.first_activity_at`만 기록하므로, 13시 재촉 알림은 막되 포인트는 생기지 않는다.

### 완료 취소: `Tasks::Revert`

- 원본 완료는 `reverted_at`만 기록한다. 삭제하지 않는다.
- 원본 `PointEvent`는 `reversed_at`을 갱신하고, 집계를 다시 계산한다.
- 취소로 목표가 미완료가 되면 `Points::RevokeDailyBonus`가 그날의 일일 보너스도 회수한다(`daily_bonus` 이벤트 `reversed_at`, `daily_bonus_awarded` 해제, `all_goals_completed_at` 초기화). 이월 되돌리기(`Tasks::UndoDefer`)도 같은 회수를 쓴다. 같은 날 목표를 다시 채우면 같은 `idempotency_key` 원장 행을 다시 써서 보너스가 재지급된다.
- `application_stage_event_id`로 연결된 완료(제출 단계가 자동으로 채운 것)는 `409 stage_backed_completion`으로 거부한다. 이 경우 단계 기록을 취소해야 한다.
- 이후 전체 완료 조건이 사라져도 과거 보상 알림은 취소하지 않는다. 다만 점수·진행도 표시는 현재 상태로 내려가고, 배지는 지표가 기준 미달이 되면 `Badges::Evaluate`가 회수한다.

### 단계 기록: `Applications::RecordStage`

1. 기기 토큰과 `Idempotency-Key`를 검증하고, 활성 단계인지(`422 inactive_stage`)·종결된 지원 건이 아닌지(`422 application_closed`) 확인한다.
2. SQLite 트랜잭션 안에서 `ApplicationStageEvent`를 만든다. 단계당 1회 제약(`reverted_at IS NULL` unique)과 제출·합격의 건당 1회 제약이 위반되면 `409 stage_already_recorded`로 응답한다.
3. `PointEvent(event_type: application_milestone, application_stage_event_id)`를 만든다. 단계 유형별 고정 포인트(제출 25 / 면접 30 / 합격 100)를 사용한다.
4. 제출 단계라면 오늘의 `TaskTemplate(kind: application)` 완료를 `application_stage_event_id`와 함께 자동 생성한다(`target_count` 상한 준수). 완료에는 원장 이벤트가 없으므로 포인트는 단계에서만 한 번 지급된다.
5. 합격 단계라면 `Application#status`를 `accepted`로 전환한다(취소 시 active 복귀, 수동 종결은 유지).
6. `DailySummary` 재계산 → `Rewards::Evaluate` → `Badges::Evaluate`를 같은 트랜잭션에서 실행한다.
7. 커밋 뒤 `application.stage_completed` 방송과 함께 `dashboard.updated`를 보낸다.

### 단계 취소: `Applications::RevertStage`

- 원본 단계 기록은 `reverted_at`만 기록하고, 원본 `PointEvent`는 `reversed_at`으로 되돌린다(음수 행 없음).
- 제출 단계였다면 자동 생성된 할 일 완료도 함께 취소한다(완료는 `reverted_at`, 원장 이벤트 없음).
- 합격 단계였다면 `status`가 `active`로 복귀한다. 사용자가 직접 종결한 상태는 그대로 둔다.
- 집계 재계산과 `Badges::Evaluate`를 실행하고, 커밋 뒤 `application.stage_reverted`를 방송한다.

### 배지 평가: `Badges::Evaluate`

- `badge_rules`(전역 규칙)과 `badge_achievements`(사용자별 달성)를 비교해 미달성 배지를 채우고, 기준 미달이 된 달성은 회수한다.
- 진입점은 여섯 곳이다. 할 일 완료·타이머 완료 트랜잭션 안(Rewards 뒤), 할 일 만들기(`TaskTemplatesController#create`), 완료 취소(`CompletionsController#destroy`), 할 일 삭제(`TaskTemplatesController#destroy`), `GET /badges` 읽기 직전.
- `(user_id, badge_rule_id)` unique 제약 위반(`RecordNotUnique`)과 검증 실패(`RecordInvalid`)를 이미 획득으로 간주해 흡수하므로 중복 호출에도 멱등이다.
- 사용자가 TASK를 취소(완료 취소·삭제)해 지표가 기준 미달이 되면 달성 기록을 회수한다. 연속 기록이 끊겨서는 회수하지 않으며(누적 합계 기준), 규칙은 `Badges::SyncDefaultRules`가 코드 기본값(63종)으로 만들고 새 키만 추가하며 표시 순서만 기본값 배열에 맞춘다. 규칙 테이블과 달성 기록은 분리되어 있다.

## 7. 실시간 동기화

- 인증된 기기는 `TrackerChannel`을 구독한다.
- 변경이 커밋된 뒤 서버가 `dashboard.updated`, `task.completed`, `task.reverted`, `focus.completed`, `reward.achieved`, `settings.updated`, `application.created`, `application.updated`, `application.stage_completed`, `application.stage_reverted`, `application_stage.updated`를 방송한다.
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
- `PERSONAL_ACCESS_KEY`는 기기 등록 시 필요한 개인 접속 키다. 설정되어 있으면 `POST /devices/activate`가 `access_key`를 검증하고, production에서 미설정이면 활성화가 실패한다.
- 기기 활성화는 IP당 시간당 10회로 제한된다.
- 기기 토큰은 DB에 해시로 저장하고, 원문은 발급 순간 한 번만 반환한다.
- Action Cable은 기기 토큰이 아니라 `POST /realtime-tickets`가 발급하는 12시간짜리 서명 ticket으로 인증한다. 장기 토큰이 접속 로그에 남지 않는다.
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
10. 마일스톤·배지 API(규칙·달성·평가·발자국 응답). ✅
11. 지원 현황 API(회사별 단계 기록·취소·종결, `point_events` 원장 재생성 마이그레이션). ✅
12. HTTPS 배포, 영속 SQLite 백업, 실제 기기 알림 검증.

## 로컬 실행

```bash
bundle install
bin/rails db:prepare
bin/rails server
```

개발 데이터는 `bin/rails db:seed`로 만든다. 로컬 Task API를 확인할 때만 `Authorization: Bearer development-token`을 사용한다. 이 토큰은 개발 전용이므로 실제 배포에서는 기기 활성화 API가 발급한 토큰으로 교체한다.

새 기기는 첫 실행 시 `POST /api/v1/devices/activate`에 `installation_id`, `name`, `platform`을 전송해 자동 등록된다. 서버에 `PERSONAL_ACCESS_KEY`가 설정되어 있으면 `access_key`도 함께 보내야 한다. 반환된 `access_token`은 그 응답에서만 보이며, 이후 모든 보호된 API에 `Authorization: Bearer <access_token>`으로 전송한다.
