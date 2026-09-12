# 취준 리워드 트래커 — 제품·개발 설계서

## 1. 제품 정의

취업 준비를 게임처럼 지속할 수 있게 돕는 **개인 전용 리워드 트래커**다. 웹과 모바일 앱에서 같은 데이터를 즉시 보고, 집중 타이머·할 일·포인트·보상·알림을 한 흐름으로 사용한다.

### 핵심 원칙

- 사용자 1명만을 위한 비공개 서비스다. 회원가입과 소셜 기능은 만들지 않는다.
- 웹과 앱은 하나의 Rails API와 SQLite 데이터베이스를 사용해 자동 동기화한다.
- 실패를 벌주지 않는다. 스트릭은 “연속 완료 일수”가 아니라 “누적 완료 일수”를 기본 지표로 하고, 최근 연속 기록은 보조로만 제공한다.
- 오늘 할 일을 시작하는 부담을 줄이는 데 집중한다. 13시까지 활동이 없으면 한 번만 부드럽게 재촉한다.

## 2. 목표와 범위

### 첫 출시(MVP)

1. 오늘의 할 일 템플릿을 체크하고 즉시 포인트를 반영한다.
2. 25분 기본 집중 타이머(사용자 조절 가능)를 실행하고, 완료 시 포인트를 준다.
3. 오늘·이번 주 포인트, 완료율, 누적 완료 일수, 최근 7일 기록을 보여준다.
4. 일일/주간 보상 기준 도달 시 앱·웹에 축하 알림을 보낸다.
5. 매일 13:00(Asia/Seoul)까지 타이머 시작 또는 할 일 완료가 없으면 재촉 알림을 한 번 보낸다.
6. 웹과 iOS/Android 앱 사이에 변경사항을 자동 동기화한다.

### 이번 범위에서 제외

- 다중 사용자, 초대, 공유, 랭킹, 결제
- 실제 보상 구매·지급
- 복잡한 취업 공고 수집이나 지원서 관리
- 오프라인에서 수정한 내용의 완전한 양방향 충돌 해결
- AI 집중 코치와 외부 AI Provider 연동 (사용 패턴이 쌓인 뒤 별도 확장)

## 3. 사용자 흐름

### 매일 사용하는 흐름

1. 홈에서 오늘의 목표와 현재 포인트를 본다.
2. “집중 시작”으로 25분 타이머를 실행하거나, 완료한 할 일을 체크한다.
3. 완료 이벤트가 즉시 서버에 저장되고 모든 기기에 반영된다.
4. 포인트와 보상 진행도가 바뀌며, 기준을 넘으면 축하 메시지가 표시된다.
5. 13시까지 아무 활동이 없으면 “5분만 시작해볼까요?” 알림을 받는다.

### 기기 연결 흐름

- 첫 기기에서 비공개 인스턴스의 개인 접속 키를 입력한다.
- 다른 기기에서는 설정 화면의 QR 코드를 스캔하거나 동일 키를 입력한다.
- 각 기기는 고유한 설치 ID와 푸시 토큰을 등록한다. 별도 계정은 없다.

## 4. 기능 명세

### 4.1 오늘의 할 일

- 기본 항목: 집중 세션, 알고리즘 1문제, 이력서/포트폴리오 개선, 실제 지원.
- 항목은 제목, 포인트, 목표 횟수(기본 1회), 표시 순서, 활성 여부를 가진다.
- 오늘의 완료는 체크 토글이 아니라 `완료 이벤트`로 기록한다. 따라서 실수로 취소해도 포인트 계산과 기록을 안전하게 되돌릴 수 있다.
- 모든 활성 항목을 채우면 일일 완료 보너스를 단 한 번 지급한다.

### 4.2 포인트와 보상

기본값은 사용자가 설정에서 수정할 수 있다.

| 행동 | 포인트 |
| --- | ---: |
| 25분 집중 세션 완료 | +10 |
| 알고리즘 1문제 | +15 |
| 이력서/포트폴리오 개선 1건 | +20 |
| 실제 지원 1건 | +25 |
| 하루 목표 전체 완료 | +30 |

- 일일 보상: 오늘 100점 도달 시 알림과 보상 문구 표시.
- 주간 보상: 월요일 00:00~일요일 23:59, 300점 도달 시 알림과 보상 문구 표시.
- 동일 기준 보상은 기간별로 한 번만 알린다.

### 4.3 집중 타이머

- 기본 집중 25분, 휴식 5분. 설정에서 1~120분으로 조절 가능.
- 상태: `idle` → `running` → `paused` → `completed` 또는 `cancelled`.
- 시작만 해도 “오늘 활동”으로 인정하여 13시 재촉 알림을 막는다.
- 완료할 때만 집중 세션 포인트와 완료 이벤트를 기록한다.
- 앱은 백그라운드 상태에서도 로컬 알림으로 종료를 알린다. 웹은 페이지가 열린 상태에서 즉시 안내하고, 권한이 있는 브라우저에는 Web Push를 보낸다.
- 타이머의 기준 시간은 서버가 아니라 기기 단조 시계로 계산하고, 완료 이벤트에 시작·종료 시각을 전송한다.

### 4.4 알림

| 종류 | 조건 | 전달 방식 | 중복 방지 |
| --- | --- | --- | --- |
| 타이머 종료 | 집중/휴식 시간 종료 | 앱 로컬 알림, 웹 인앱 안내 | 타이머 실행 1회당 1회 |
| 일일 재촉 | 매일 13:00 KST까지 활동 없음 | Expo Push + Web Push, 불가 시 다음 앱 실행 때 인앱 배너 | 날짜당 1회 |
| 일일 보상 | 일일 포인트 100 도달 | 현재 기기 인앱 + 등록 기기 푸시 | 날짜·보상별 1회 |
| 주간 보상 | 주간 포인트 300 도달 | 현재 기기 인앱 + 등록 기기 푸시 | 주차·보상별 1회 |

- 기본 재촉 문구: “아직 오늘의 첫 기록이 없어요. 5분 타이머부터 가볍게 시작해볼까요?”
- 재촉 알림은 설정에서 켜고 끌 수 있으며, 기본값은 켜짐이다.
- 시간대는 서버와 모든 기기에서 `Asia/Seoul`로 고정한다.

### 4.5 기록과 통계

- 오늘: 총 포인트, 완료 수/전체 목표, 타이머 누적 시간.
- 주간: 총 포인트, 7일 막대 기록, 달성한 보상.
- 누적 완료 일수: 하루 목표 전체를 완료한 날짜 수.
- 최근 연속 기록: 오늘부터 거슬러 올라간 연속 전체 완료 날짜 수. 놓친 날이 있어도 누적 완료 일수는 줄지 않는다.

## 5. 기술 아키텍처

### 기술 선택

- 클라이언트: **React Native + Expo + Expo Router + TypeScript**
- 웹: 같은 React Native 코드베이스를 **React Native Web**으로 빌드한 PWA
- 서버: **Ruby on Rails API 모드**
- DB: 서버의 **SQLite 3** (WAL 모드, 영속 볼륨 필수)
- 실시간 동기화: REST 변경 요청 + Action Cable(WebSocket) 이벤트 수신
- 앱 알림: Expo Notifications / Expo Push Service
- 웹 알림: Service Worker + Web Push (VAPID)
- 예약 작업: Rails Solid Queue의 반복 작업으로 13시 알림 판정

### 배포 형태

```
React Native 앱 (iOS/Android) ─┐
                                ├─ HTTPS / WebSocket ─ Rails API ─ SQLite (영속 디스크)
React Native Web PWA ───────────┘                         │
                                                           ├─ Expo Push
                                                           └─ Web Push
```

- Rails와 SQLite는 하나의 소형 서버/영속 볼륨에서 함께 실행한다. SQLite 파일을 컨테이너의 임시 파일시스템에 두면 안 된다.
- HTTPS가 필요하다. PWA 설치, Service Worker, Web Push의 전제 조건이다.
- 서버는 개인 접속 키를 환경 변수로 보관한다. 앱/웹은 최초 연결 후 기기별 토큰을 안전 저장소에 보관한다.

### 인증 방식: 개인 기기 키

- 로그인 화면과 계정 테이블을 만들지 않는다.
- 최초 연결 시 한 번만 개인 접속 키를 교환하고, 서버가 설치 ID별 장기 기기 토큰을 발급한다.
- 모든 API와 WebSocket 연결은 기기 토큰을 검증한다.
- 토큰 폐기는 설정의 “이 기기 연결 해제”에서 `DELETE /api/v1/devices/current`으로 가능하다.
- 개인 서버라도 HTTPS와 충분히 긴 접속 키는 필수다.

## 6. 데이터 모델

### `devices`

| 필드 | 설명 |
| --- | --- |
| id | UUID |
| installation_id | 앱 설치별 UUID, unique |
| name | 예: Mina의 iPhone |
| platform | ios, android, web |
| access_token_digest | 기기 토큰 해시 |
| expo_push_token | 앱 푸시 토큰, nullable |
| web_push_subscription | Web Push 구독 JSON, nullable |
| last_seen_at | 마지막 API 사용 시각 |

### `task_templates`

| 필드 | 설명 |
| --- | --- |
| id | UUID |
| title | 할 일 이름 |
| points | 완료 1회 포인트 |
| target_count | 하루 목표 횟수 |
| position | 노출 순서 |
| active | 사용 여부 |
| kind | focus, algorithm, portfolio, application, custom |

### `daily_task_completions`

| 필드 | 설명 |
| --- | --- |
| id | UUID |
| task_template_id | 원본 할 일 |
| completed_on | KST 기준 날짜 |
| sequence | 같은 항목의 n번째 완료 |
| source_device_id | 기록한 기기 |
| reverted_at | 취소 시각, nullable |

제약: `(task_template_id, completed_on, sequence)` unique.

### `focus_sessions`

| 필드 | 설명 |
| --- | --- |
| id | UUID |
| started_at / ended_at | 실제 집중 시작·종료 시각 |
| planned_seconds | 설정한 집중 시간 |
| status | running, completed, cancelled |
| source_device_id | 실행 기기 |

### `point_events`

점수의 원장이다. 완료·타이머·일일 보너스가 발생할 때마다 점수를 이 테이블에 기록한다.

| 필드 | 설명 |
| --- | --- |
| id | UUID |
| completion_id | 할 일 완료 이벤트, nullable |
| focus_session_id | 집중 세션, nullable |
| source_device_id | 이벤트를 일으킨 기기, nullable |
| activity_date | KST 기준 점수 귀속 날짜 |
| event_type | task_completion, focus_completion, daily_bonus, adjustment |
| points | 지급 또는 조정 점수 (음수 허용) |
| idempotency_key | 네트워크 재시도 중복 방지 키, unique |
| occurred_at / reversed_at | 발생·취소 시각 |

제약: `completion_id`와 `focus_session_id`는 최대 하나만 값이 있어야 한다.

### `daily_summaries`

| 필드 | 설명 |
| --- | --- |
| date | KST 날짜, unique |
| points_total | 해당 일의 유효 포인트 합계 |
| all_goals_completed_at | 전체 목표 달성 시각 |
| first_activity_at | 첫 타이머 시작 또는 완료 시각 |
| daily_bonus_awarded | 일일 보너스 지급 여부 |

### `reward_rules`, `reward_achievements`

- 규칙: 기간(`daily`, `weekly`), 필요 포인트, 보상 문구, 활성 여부.
- 달성: 규칙, 기간 키(`2026-09-11`, `2026-W37`), 달성 시각, 알림 시각.
- 제약: `(reward_rule_id, period_key)` unique.

### `notification_deliveries`

- 기기, 종류, 날짜/기간 키, 발송 시각, 전송 결과를 기록한다.
- 제약: `(device_id, notification_type, schedule_key)` unique로 중복 발송을 막는다.

### `settings`

- 단일 레코드: 집중/휴식 기본 시간, 재촉 알림 활성화, 재촉 시간, 일일·주간 목표점, 리워드 문구.

## 7. API와 실시간 이벤트

모든 응답은 ISO 8601 UTC 시각과 KST 날짜를 함께 쓴다. 클라이언트는 서버 `revision` 번호를 저장해 이벤트 순서를 판정한다.

| 메서드 | 경로 | 역할 |
| --- | --- | --- |
| POST | `/v1/devices/activate` | 개인 접속 키로 기기 등록 |
| GET | `/v1/dashboard?date=YYYY-MM-DD` | 홈에 필요한 집계·할 일·보상 반환 |
| POST | `/v1/tasks/:id/completions` | 할 일 1회 완료 |
| DELETE | `/v1/completions/:id` | 완료 취소 |
| POST | `/v1/focus-sessions` | 타이머 시작 기록 |
| PATCH | `/v1/focus-sessions/:id` | 완료/취소 기록 |
| GET | `/v1/history?from=&to=` | 일별 점수와 기록 |
| GET/PATCH | `/v1/settings` | 개인 설정 조회·수정 |
| POST | `/v1/push-subscriptions` | 앱/웹 푸시 토큰 등록 |

Action Cable 채널: `TrackerChannel`.

- 이벤트: `dashboard.updated`, `task.completed`, `task.reverted`, `focus.completed`, `reward.achieved`, `settings.updated`.
- 클라이언트가 수신하면 관련 화면을 낙관적 상태가 아닌 서버 기준 데이터로 다시 맞춘다.

## 8. 핵심 처리 규칙

### 포인트 계산

1. 완료 요청은 DB 트랜잭션으로 저장한다.
2. 항목의 현재 유효 완료 수가 `target_count`를 넘으면 거절한다.
3. 완료 당시 포인트를 `point_events`에 원장 이벤트로 기록한다.
4. `daily_summaries`를 재계산한다.
5. 모든 활성 목표 충족 및 일일 보너스 미지급이면 `point_events`에 보너스 이벤트를 별도로 기록한다.
6. 일일·주간 보상 달성 여부를 확인하고 `reward_achievements`를 unique 제약으로 생성한다.
7. 커밋 후 WebSocket 이벤트와 푸시 작업을 발행한다.

### 13시 재촉 작업

1. 매분 실행하되 `Asia/Seoul` 기준 정확히 13:00분에만 대상일을 처리한다.
2. 재촉 기능이 켜져 있고 `daily_summaries.first_activity_at`이 비어 있으면 대상이다.
3. 각 활성 기기에 발송 이력이 없을 때만 큐에 넣는다.
4. 앱 푸시 또는 Web Push가 실패해도 `notification_deliveries`에 실패를 남기고 무한 재시도하지 않는다.
5. 13시 이후 처음 앱을 열면, 알림 수신 실패 기기에만 인앱 배너를 한 번 보여준다.

### 동기화와 충돌

- 서버가 항상 진실의 원천이다.
- 완료 생성은 UUID idempotency key를 포함한다. 네트워크 재시도로 중복 포인트를 만들지 않는다.
- 두 기기에서 같은 마지막 완료 칸을 동시에 누르면 먼저 성공한 요청만 수락한다. 다른 기기는 `409 target_already_met` 후 대시보드를 갱신한다.
- 앱은 읽기 캐시를 유지할 수 있지만, 오프라인 변경 버튼은 MVP에서는 비활성화하고 “연결 후 기록할 수 있어요”를 표시한다.

## 9. 클라이언트 구조

```
apps/tracker/
  app/                 # Expo Router 화면
  features/
    dashboard/
    timer/
    history/
    settings/
  services/
    api.ts
    realtime.ts
    notifications.ts
  store/               # 서버 캐시 + 가벼운 UI 상태
  components/

server/
  app/controllers/api/v1/
  app/models/
  app/services/        # Points::Award, Rewards::Evaluate 등
  app/jobs/
  app/channels/
  config/recurring.yml
```

백엔드의 레이어, API 계약, 트랜잭션, 실시간 동기화, 알림 작업의 상세 설계는 [`backend/README.md`](backend/README.md)를 기준 문서로 한다.
집중 타이머의 상태 전이와 API·점수 판정 상세는 [`backend/docs/focus-timer.md`](backend/docs/focus-timer.md)를 기준으로 한다.

- TanStack Query로 API 캐시·재시도·무효화를 관리한다.
- 타이머의 진행 초는 로컬 상태에서 계산하고, 서버에는 시작/완료 같은 사건만 저장한다.
- 기기 키는 iOS/Android에서 Expo SecureStore, 웹에서는 암호화가 아닌 일반 저장소를 사용하되 HTTPS와 개인 서버 접근 키로 보호한다. 웹 공유 기기에서는 사용하지 않는 것을 권장한다.

## 10. 개발 순서 (1인 개발 기준)

### 1단계: 기초 — 1일

- Rails API, SQLite 마이그레이션, 개인 기기 키 인증.
- React Native/Expo 프로젝트와 웹 빌드, 대시보드 읽기 API.
- 기본 할 일과 완료 이벤트, 포인트 계산 테스트.

### 2단계: 핵심 사용성 — 1일

- 오늘 할 일, 보상, 최근 7일 기록.
- 집중/휴식 타이머, 시작·완료 저장, 다중 기기 동기화.
- 오류·중복 클릭·동시 완료 처리.

### 3단계: 알림과 배포 — 1일

- Expo/웹 푸시 토큰 등록, 타이머 로컬 알림.
- 13시 재촉 반복 작업, 보상 알림.
- HTTPS·영속 SQLite 볼륨을 갖춘 개인 서버 배포, PWA 설치 검증.

### 첫 사용 전 체크

- iPhone 앱 알림 권한을 허용한다.
- Safari 웹 알림은 지원 환경에서만 선택적으로 켠다.
- 실제 13시 알림은 테스트용 시간으로 한 번 검증한 뒤 13:00 KST로 되돌린다.
- 웹에서 완료한 항목이 앱에, 앱에서 완료한 항목이 웹에 3초 이내 반영되는지 확인한다.

## 11. 완료 기준

- 두 기기에서 같은 오늘 포인트와 체크 상태를 본다.
- 타이머가 백그라운드에서도 종료 알림을 보낸다.
- 활동이 없는 날 13:00 KST에 한 번만 재촉한다.
- 100점/주간 300점 보상은 중복 없이 표시된다.
- 인터넷이 끊긴 상태에서 포인트 중복이나 기록 손실이 일어나지 않는다.
