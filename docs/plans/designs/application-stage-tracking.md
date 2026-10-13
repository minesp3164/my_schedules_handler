# 지원 단계 추적 (이력서 제출) 설계 문서

작성일: 2026-10-13
상태: 설계 승인 완료 (독립 검토 Tier 1 반영)
다음 단계: 작업 분해(`/plan` 또는 oma-pm)

## 1. 목적

회사별로 "이력서 제출 → 면접 → 합격"의 진행 내역을 남기고, 각 단계를 기록할 때마다 부분 포인트를 지급한다. 지원 관련 포인트는 **단계 기록에서만** 나오며, 단계를 기록하지 않으면 받지 않는다.

## 2. 확정된 제품 결정

| 결정 사항 | 확정 내용 |
| --- | --- |
| 범위 | 회사별 지원 기록 관리 (공고 수집·문서 관리 없음) |
| 포인트 | 단계 유형(`kind`)별 고정: `submission` +25 / `interview` +30 / `pass` +100 |
| 단계 커스터마이징 | 이름·추가·삭제 가능. 포인트는 수정 불가 |
| 원장 | `point_events`에 편입, 일일/주간 보상 합산에 반영 |
| 합격 +100 | 일일(100)/주간(300) 합산에 그대로 반영 (사용자 확정) |
| 불합격·포기 | 종결 상태만 기록, 포인트 회수 없음 (실패 미벌칙 원칙 유지) |
| 화면 위치 | 홈 카드 + 별도 스택 화면. 하단 탭 5개 유지 |
| 중복 방지 | 단계 기록이 지원 포인트의 유일한 경로. "실제 지원" 수동 체크는 제출 단계 기록 흐름으로 흡수 |

## 3. 데이터 모델

### `applications`

| 필드 | 설명 |
| --- | --- |
| id | UUID |
| company | 회사명 (필수) |
| title | 공고명 (선택) |
| url | 공고/지원 링크 (선택) |
| memo | 메모 (선택) |
| status | `active` / `rejected` / `withdrawn` / `accepted` |
| closed_at | 종결 시각 (nullable) |

`accepted`는 합격 단계 완료 시 자동 전환. `rejected`/`withdrawn`은 수동 종결이며 포인트는 회수하지 않는다.

### `application_stages`

| 필드 | 설명 |
| --- | --- |
| id | UUID |
| name | 단계 이름 (예: "서류 제출", "1차 면접") |
| kind | `submission` / `interview` / `pass` — 포인트는 여기서 고정 |
| position | 표시 순서 |
| active | 사용 여부. 삭제 대신 비활성화 |

기본 제공 3단계: 제출(submission) / 면접(interview) / 합격(pass).
제약: 활성 단계는 항상 1개 이상.

### `application_stage_events`

| 필드 | 설명 |
| --- | --- |
| id | UUID |
| application_id | 지원 건 |
| application_stage_id | 단계 정의 |
| stage_kind | 단계 kind의 복사본 (DB 인덱스용) |
| source_device_id | 기록 기기 |
| reverted_at | 취소 시각 (nullable) |
| idempotency_key | 재시도 중복 방지, unique |

- `completed_on`은 **서버가 결정**한다. MVP에서는 과거 날짜 소급 기록을 허용하지 않는다(과거 기간 보상 재발화 방지).
- 단계 완료는 단계 정의당 지원 건당 1회: partial unique index `(application_id, application_stage_id) WHERE reverted_at IS NULL`.
- `submission`과 `pass` 유형은 지원 건당 각 1회만: partial unique index `(application_id) WHERE stage_kind = 'submission' AND reverted_at IS NULL`, 동일하게 `pass`. `interview`는 1차/2차처럼 중복 허용.

### `point_events` 확장

- `event_type`에 `application_milestone` 추가 (모델 inclusion 검증 포함).
- 컬럼 `application_stage_event_id` 추가. 기존 "completion_id / focus_session_id 최대 하나" 제약을 3-way로 확장 (SQLite은 CHECK 변경 불가 → 테이블 재생성 마이그레이션).
- partial unique index `application_stage_event_id` (`WHERE reversed_at IS NULL`)로 단계당 1회 지급을 DB 수준에서 보장.

## 4. 처리 규칙

### 단계 완료 (POST `/v1/applications/:id/stage-events`)

DB 트랜잭션 순서:

1. 중복 제약 검사 (이미 기록된 단계면 `409 stage_already_recorded`).
2. `application_stage_events` 저장.
3. `point_events`에 `application_milestone` 이벤트 기록 (kind별 고정 포인트).
4. **`submission` 단계일 때**: 그날의 활성 application 종류 할 일 완료(`daily_task_completions`)를 자동 생성 — 일일 목표 판정·일일 보너스·마일스톤 집계가 기존 루프 그대로 작동하도록. 이 완료가 별도 포인트 이벤트를 만들지 않으므로 중복 지급 없음. 구현에서 이 완료는 `daily_task_completions.application_stage_event_id` 컬럼으로 단계 이벤트와 연결되며, `Tasks::Revert`는 이 연결이 있는 완료를 `409 stage_backed_completion`으로 거부한다(단계 취소로만 되돌린다).
5. `daily_summaries` 재계산 → `Points::DailyBonus`(기존 `daily-bonus-#{date}` 키, `RecordNotUnique` 발생 시 재평가로 재시도) → 일일/주간 보상 판정.
6. `pass` 단계면 `applications.status = accepted` (이미 `rejected`/`withdrawn`이면 덮어쓰지 않음).
7. 커밋 후 `application.stage_completed` / `application.updated` WebSocket 이벤트 발행.

### 단계 취소 (DELETE `/v1/stage-events/:id`)

- 기존 `Tasks::Revert` 패턴을 그대로 따른다: 이벤트 `reverted_at` + 포인트 이벤트 `reversed_at` 설정. **음수 조정 행을 만들지 않는다** (`PointEvent.effective`에서 자동 제외).
- 원래 `activity_date` 기준으로 `daily_summaries` 재계산 + 보상 재평가 + 배지 재평가.
- submission 취소 시 자동 생성된 그날 할 일 완료도 함께 취소. pass 취소 시 status는 `active`로 조건부 복원(그 사이 수동 종결이 있으면 유지).

### "실제 지원" 수동 체크

- 기존 체크 동작은 **제출 단계 기록 흐름으로 흡수**된다: 체크 → 회사 선택(신규 등록 포함) → 제출 단계 기록 완료.
- 단계 기록 없이 점수만 주는 경로는 없다. 회사 없이 체크만 하는 옵션은 MVP에 두지 않는다.

### 타깃 횟수 관계

- 단계 포인트는 "지원 건당 단계당 1회"로 지급되며 일일 `target_count` 상한의 영향을 받지 않는다.
- 자동 생성되는 할 일 완료는 기존처럼 `target_count` 상한을 지킨다(하루 여러 건 제출해도 목표 판정은 기존 규칙대로).

## 5. API

| 메서드 | 경로 | 역할 |
| --- | --- | --- |
| GET | `/v1/applications?status=` | 지원 건 목록 (진행 중/종결) |
| POST | `/v1/applications` | 지원 등록 (company 필수) |
| PATCH | `/v1/applications/:id` | 종결(불합격·포기)·메모 수정 |
| GET / POST | `/v1/application-stages` | 단계 정의 조회 / 추가 |
| PATCH / DELETE | `/v1/application-stages/:id` | 단계 수정 / 비활성화 (완료 이력 있으면 비활성만) |
| POST | `/v1/applications/:id/stage-events` | 단계 완료 기록 (`stage_id`, `idempotency_key`) |
| DELETE | `/v1/stage-events/:id` | 단계 완료 취소 |

WebSocket (`TrackerChannel`) 신규 이벤트: `application.created`, `application.stage_completed`, `application.updated`, `application_stage.updated` (agent.md §7 이벤트 목록 갱신).

## 6. 프론트엔드

- **홈 카드**: 한 줄 구성(진행 중 N건 + 다음 액션 1개). 홈이 이미 카드가 많아 과부하되지 않도록 상세는 지원 화면에 위임. 기록 없으면 "첫 지원 기록하기" CTA.
- **지원 현황 화면** (스택, `tasks.tsx` 패턴):
  - 진행 중 목록: 회사별 카드(현재 단계 + 다음 단계 버튼).
  - 종결 목록: 불합격/포기/합격, 접이식 + 빈 상태 문구.
  - 지원 등록 모달: 회사명 필수, 공고명·링크·메모 선택.
  - 단계 관리 화면: 추가·이름 수정·비활성화, 순서 이동.
- **기록 화면 연동**: 포인트 히스토리·달력에서 마일스톤 이벤트가 회사명/단계명과 함께 표시되도록 `History::List` 페이로드 확장 (`includes` 프리로딩 포함).
- i18n: `frontend/locales/{ko,ja}` 키 추가.

## 7. 범위·문서 정리

- `agent.md` 제외 범위를 정직하게 수정: "공고 수집과 전체 지원서 관리(문서·다단계 파이프라인)"는 제외, **회사별 단계 로그는 허용**으로 명시.
- `agent.md` 기능 명세(§4)에 지원 단계 추적 절 추가, 데이터 모델·API 표 갱신.
- `README.md` 핵심 기능에 한 줄 추가.
- **MVP 이후(phase 2) 항목**으로 분류한다. 개발 순서(§10)에 4단계로 추가.

## 8. 잔여 위험 (수용함)

- 합격 +100이 일일 보상(100)을 단일 이벤트로 달성시킨다. 사용자가 수용한 결정이며, 소급 기록 금지로 "그날 아무것도 안 했는데 터지는 축하" 위험은 최소화된다.
- 단계 포인트가 설정 화면에서 조정되지 않는다(사용자 확정: 고정). 향후 조정 필요 시 settings 테이블로 이관.

## 9. 검토 이력

- 독립 리뷰 2회(데이터 모델·동시성 렌즈 / 제품 원칙·UX 렌즈) 수행.
- Tier 1 8건 전부 반영: 취소 방식 정합성, 원장 제약 마이그레이션, 일일 보너스 경로, DB 수준 중복 가드, 타깃 상한 관계, 소급 기록 금지, 합격 상태 복원 경합, 0점 경로 제거.
