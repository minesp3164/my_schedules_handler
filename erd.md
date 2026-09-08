# 취준 리워드 트래커 ERD (MVP)

```mermaid
erDiagram
    DEVICES ||--o{ DAILY_TASK_COMPLETIONS : records
    DEVICES ||--o{ FOCUS_SESSIONS : runs
    DEVICES ||--o{ NOTIFICATION_DELIVERIES : receives
    TASK_TEMPLATES ||--o{ DAILY_TASK_COMPLETIONS : defines
    DAILY_TASK_COMPLETIONS ||--|| POINT_EVENTS : awards
    FOCUS_SESSIONS ||--o| POINT_EVENTS : awards_on_completion
    REWARD_RULES ||--o{ REWARD_ACHIEVEMENTS : unlocks

    DEVICES { string id PK string installation_id UK string platform string access_token_digest datetime last_seen_at }
    TASK_TEMPLATES { string id PK string title integer points integer target_count integer position string kind boolean active }
    DAILY_TASK_COMPLETIONS { string id PK string task_template_id FK string source_device_id FK date completed_on integer sequence datetime completed_at datetime reverted_at }
    FOCUS_SESSIONS { string id PK string source_device_id FK datetime started_at integer planned_seconds string status datetime paused_at integer paused_seconds datetime ended_at integer completed_seconds integer active_lock string start_idempotency_key UK }
    POINT_EVENTS { string id PK string daily_task_completion_id FK string focus_session_id FK string source_device_id FK date activity_date string event_type integer points string idempotency_key UK datetime occurred_at datetime reversed_at }
    DAILY_SUMMARIES { date date PK integer points_total datetime first_activity_at datetime all_goals_completed_at boolean daily_bonus_awarded }
    REWARD_RULES { string id PK string period integer required_points string reward_text boolean active }
    REWARD_ACHIEVEMENTS { string id PK string reward_rule_id FK string period_key datetime achieved_at datetime notified_at }
    NOTIFICATION_DELIVERIES { string id PK string device_id FK string notification_type string schedule_key string status datetime sent_at }
    SETTINGS { integer id PK integer focus_minutes integer break_minutes boolean nudge_enabled time nudge_at string timezone }
```

## 설계 원칙

- `point_events`가 점수의 원장이다. 점수를 다시 계산하거나 취소해도 기록의 이유와 당시 점수가 사라지지 않는다.
- `daily_summaries`는 화면 속도를 위한 날짜별 집계 캐시이며, 다른 테이블을 참조하는 원본 데이터가 아니다.
- 모든 일자(`completed_on`, `activity_date`, `daily_summaries.date`)는 `Asia/Seoul`을 기준으로 저장한다. 시각은 UTC로 저장한다.
- `settings`는 개인 1인 서비스이므로 단일 행만 유지한다.

## 필수 제약 조건

| 테이블 | 제약 |
| --- | --- |
| `devices` | `installation_id` unique |
| `daily_task_completions` | `(task_template_id, completed_on, sequence)` unique |
| `focus_sessions` | 활성 상태 행은 최대 하나; `start_idempotency_key` unique |
| `point_events` | `idempotency_key` unique; `daily_task_completion_id`와 `focus_session_id` 중 최대 하나만 값 허용 |
| `reward_achievements` | `(reward_rule_id, period_key)` unique |
| `notification_deliveries` | `(device_id, notification_type, schedule_key)` unique |
| `settings` | `id = 1`만 허용 |
