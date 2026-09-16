# Rails 백엔드 설계 근거 — "왜 그렇게 했는가?" 답변 정리

코드 리뷰·면접·문서화 자리에서 "왜 이렇게 설계했는가?"라는 질문에 답할 때의 근거를 패턴별로 정리했다. 각 항목에 실제 코드를 함께 둔다.

---

## 아키텍처 전반

### Q. 왜 컨트롤러 대신 서비스 객체에 로직을 뒀나?

컨트롤러는 HTTP 경계(인증·파라미터·응답 형식)만 담당하고, 도메인 규칙은 `Tasks::Complete`, `FocusSessions::Complete` 같은 호출 객체에 모았다.

- 트랜잭션 경계를 한 곳에서 볼 수 있다. 컨트롤러에 로직이 흩어지면 "어디까지가 원자적 연산인지"가 숨는다.
- `Data.define` 결과 객체(`completion`, `point_events`, `replayed` …)를 반환하므로 컨트롤러가 무엇을 응답할지만 결정한다.
- HTTP 없이 서비스 단위로 테스트할 수 있다. 실제로 `test/services/`에 핵심 테스트가 몰려 있다.
- `self.call(...) → new(...).call` 위임 패턴으로 `Tasks::Complete.call(...)` 한 줄 호출을 유지했다.

```ruby
# app/services/tasks/complete.rb — 모든 서비스가 따르는 공통 형태
module Tasks
  class Complete
    Result = Data.define(:completion, :point_events, :daily_summary,
                         :reward_achievements, :replayed)

    class TargetAlreadyMet < StandardError; end
    class InactiveTask < StandardError; end

    def self.call(...)
      new(...).call
    end
    # ...
  end
end
```

컨트롤러는 서비스 결과를 응답으로 번역하고, 커밋 후 부수 효과만 실행한다.

```ruby
# app/controllers/api/v1/task_templates/completions_controller.rb
def create
  result = Tasks::Complete.call(
    task_template_id: params[:task_template_id],
    source_device: current_device,
    idempotency_key: request.headers["Idempotency-Key"]
  )
  revision = unless result.replayed
    Realtime::Publish.call(
      event: "task.completed",
      data: { task_template_id: params[:task_template_id],
              completion_id: result.completion.id }
    ).revision
  end
  result.reward_achievements.each do |achievement|
    SendRewardNotificationJob.perform_later(achievement.id)
  end
  render json: { data: { ... }, meta: { revision: ..., server_time: ... } },
         status: result.replayed ? :ok : :created
end
```

### Q. 왜 "서버가 유일한 진실의 원천"인가?

클라이언트는 사건(완료했다, 타이머를 시작했다)만 보내고 점수 계산·보상 판정·중복 방지는 전부 서버에서 한다. 클라이언트가 점수를 계산하면 기기 간 시간 오차, 조작된 요청, 오프라인 재시도로 원장이 깨진다. 서버가 계산하고 결과를 방송하면 모든 기기가 같은 숫자를 본다.

---

## 포인트 원장 (point_events)

### Q. 왜 점수를 컬럼에 누적하지 않고 이벤트 테이블로 만들었나?

`daily_summaries.points_total` 같은 누적 컬럼만 있으면 "이 점수가 왜 생겼는지"를 잃고, 취소·재계산 시 원인별로 되돌릴 수 없다. 이벤트 원장이면:

- 점수 변동의 이유(`event_type`), 당시 점수(`points`), 발생 시각이 영구 보존된다.
- 합계는 언제든 `SUM(points)`로 재계산 가능 → `daily_summaries`는 진실이 아닌 캐시가 될 수 있다.
- 취소도 새로운 사실(`reversed_at`)을 추가하는 방식이라 이력이 남는다. 회계의 분개장과 같은 구조다.

```ruby
# app/models/point_event.rb
class PointEvent < ApplicationRecord
  belongs_to :user
  belongs_to :daily_task_completion, optional: true
  belongs_to :focus_session, optional: true
  belongs_to :source_device, class_name: "Device", optional: true

  validates :activity_date, :event_type, :idempotency_key, :occurred_at, presence: true
  validates :idempotency_key, uniqueness: true
  validates :event_type, inclusion: {
    in: %w[task_completion focus_completion daily_bonus adjustment reward_redemption]
  }

  scope :effective, -> { where(reversed_at: nil) }   # 유효 점수만 집계하는 기준
end
```

### Q. 왜 삭제(DELETE) 대신 reverted_at/reversed_at 마킹인가?

실제 행을 지우면 "무엇이 취소됐는지" 자체가 사라진다. 마킹 방식은:

- `PointEvent.effective`(reversed_at이 nil) 스코프 하나로 유효 점수만 집계 → 집계 로직이 단순하다.
- 원본 완료와 그 무효화라는 두 사실이 모두 남아 감사 이력이 된다.
- 취소를 다시 되돌리는 확장(undo)도 데이터가 남아 있어 가능하다.

```ruby
# app/services/tasks/revert.rb
def self.call(completion_id:)
  DailyTaskCompletion.transaction do
    completion = DailyTaskCompletion.lock.find(completion_id)
    # 이미 취소된 완료면 아무것도 하지 않고 같은 결과를 돌려준다
    return [completion, DailySummary.find_by!(date: completion.completed_on), false] \
      if completion.reverted_at?

    completion.update!(reverted_at: Time.current)              # 완료 취소 마킹
    completion.point_event.update!(reversed_at: Time.current)  # 원장 이벤트 무효화
    summary = Points::RecalculateDailySummary.call(date: completion.completed_on)
    [completion, summary, true]
  end
end
```

### Q. 왜 완료 당시 점수를 이벤트에 스냅샷하나?

`task.points`는 나중에 바뀔 수 있다. 사용자가 할 일의 점수를 15 → 30으로 올려도 과거 완료 기록의 점수는 당시 값 그대로여야 한다. 원장은 "기록 당시의 사실"을 저장하는 것이 원칙이다.

```ruby
# app/services/tasks/complete.rb — task.points를 이벤트에 그대로 복사
event = PointEvent.create!(
  user: @source_device.user,
  daily_task_completion: completion,
  source_device: @source_device,
  activity_date: date,
  event_type: "task_completion",
  points: task.points,            # ← 완료 당시 점수 스냅샷
  idempotency_key: @idempotency_key,
  occurred_at: @now
)
```

---

## 멱등성과 동시성

### Q. 왜 Idempotency-Key를 쓰나?

모바일 환경은 요청 성공 후 응답이 유실되는 경우가 흔하다. 클라이언트가 재시도하면 서버가 같은 요청을 두 번 처리해 점수가 중복 지급된다.

- 클라이언트가 UUID 키를 헤더로 보내고, `point_events.idempotency_key`에 unique 제약을 걸었다.
- 같은 키가 오면 새로 만들지 않고 기존 결과를 **재생(replay)** 해서 `200`으로 응답한다. 재시도와 최초 요청이 동일한 결과를 보장한다.
- `daily-bonus-#{date}`, `focus-task-#{session.id}` 같은 결정적 키는 "날짜당 1회" 같은 비즈니스 규칙 자체를 제약으로 표현한다.

```ruby
# app/services/tasks/complete.rb — 일일 보너스는 결정적 키로 날짜당 1회를 보장
if all_goals_completed?(date) && !summary.daily_bonus_awarded?
  bonus = PointEvent.create!(
    user: @source_device.user,
    activity_date: date,
    event_type: "daily_bonus",
    points: Setting.instance.daily_bonus_points,
    idempotency_key: "daily-bonus-#{date}",   # 같은 날 두 번 만들 수 없음
    occurred_at: @now
  )
  summary.update!(daily_bonus_awarded: true, all_goals_completed_at: @now)
end
```

### Q. 왜 find_by 후에 트랜잭션 안에서 lock으로 다시 조회하나?

```ruby
# app/services/tasks/complete.rb
existing = PointEvent.find_by(idempotency_key: @idempotency_key)
return replay(existing) if existing            # 빠른 경로(fast path)

PointEvent.transaction do
  existing = PointEvent.lock.find_by(idempotency_key: @idempotency_key)
  return replay(existing) if existing          # 잠금 상태에서 재확인

  task = @source_device.user.task_templates.lock.find(@task_template_id)
  date = @now.in_time_zone("Asia/Seoul").to_date
  raise InactiveTask unless task.active? && task.scheduled_for?(date)

  completions_for_day = task.daily_task_completions.where(completed_on: date)
  completed_count = completions_for_day.active.count
  raise TargetAlreadyMet if completed_count >= task.target_count   # → 409

  completion = task.daily_task_completions.create!(
    source_device: @source_device,
    completed_on: date,
    sequence: completions_for_day.maximum(:sequence).to_i + 1,
    completed_at: @now
  )
  # ...
end
```

바깥 조회는 빠른 경로(fast path)다. 그런데 두 요청이 동시에 들어오면 둘 다 "없음"을 볼 수 있다. 트랜잭션 안에서 `lock`을 걸어 다시 확인하면 직렬화되어 한쪽만 생성한다. 최종 방어선은 DB unique 제약이다 — 검사(check-then-act)는 항상 경합에 지므로 제약이 마지막 보루여야 한다.

재생 응답은 원래 요청과 같은 형태로 돌려준다.

```ruby
# app/services/tasks/complete.rb
def replay(event)
  completion = event.daily_task_completion
  summary = DailySummary.find_by!(date: event.activity_date)
  Result.new(completion, [event], summary, [], true)   # replayed = true
end
```

### Q. 왜 애플리케이션 검사 대신 DB unique 제약에 의존하나?

`RewardAchievement`는 `exists?` 확인 후 `create!`하지만, 동시 요청에는 확인이 통과될 수 있다. 그래서 `(reward_rule_id, period_key)` unique 인덱스를 두고 `RecordNotUnique`를 rescue해서 nil을 반환한다. 같은 패턴이 `notification_deliveries`(device+type+schedule_key)와 `daily_task_completions`(template+date+sequence)에도 있다. **제약은 DB가 지키고, 코드는 위반을 정상 흐름으로 번역한다.**

```ruby
# app/services/rewards/evaluate.rb
def create_achievement(rule, period_key)
  return unless rule.active?
  return if RewardAchievement.exists?(reward_rule: rule, period_key: period_key)

  RewardAchievement.create!(reward_rule: rule, period_key: period_key,
                            achieved_at: @achieved_at)
rescue ActiveRecord::RecordNotUnique
  nil   # 동시 요청 경합 → unique 제약이 막음 → 이미 달성된 것으로 간주
rescue ActiveRecord::RecordInvalid => error
  raise unless error.record.is_a?(RewardAchievement) &&
               RewardAchievement.exists?(reward_rule: rule, period_key: period_key)
  nil
end
```

```ruby
# app/models/reward_achievement.rb — 모델 레벨 검증도 병행
validates :period_key, uniqueness: { scope: :reward_rule_id }
```

### Q. 왜 active_lock 컬럼으로 활성 타이머를 막나?

"사용자당 실행 중인 집중 세션은 하나"라는 규칙을 상태 문자열 검사로만 하면 동시 시작에 뚫린다. `active_lock`은 running/paused일 때만 `1`을 갖는 컬럼이라, 부분 unique 인덱스(`WHERE active_lock = 1`)로 DB가 강제할 수 있다. 완료·취소 시 `nil`로 풀린다. 코드에서는 먼저 확인해서 친절한 409를 반환한다.

```ruby
# app/services/focus_sessions/start.rb
FocusSession.transaction do
  existing = FocusSession.lock.find_by(start_idempotency_key: @idempotency_key)
  return Result.new(existing, true) if existing

  # 사용자 단위로 활성 세션을 잠금 확인 — 두 기기 동시 시작 차단
  raise ActiveFocusSessionExists if FocusSession.active
                                      .where(user: @source_device.user)
                                      .lock.exists?

  session = FocusSession.create!(
    user: @source_device.user,
    source_device: @source_device,
    started_at: @now,
    planned_seconds: @planned_seconds,
    status: "running",
    paused_seconds: 0,
    active_lock: 1,                          # ← 잠금 컬럼 세팅
    start_idempotency_key: @idempotency_key
  )
  # ...
end
```

```ruby
# app/services/focus_sessions/complete.rb — 완료 시 잠금 해제
@focus_session.update!(
  status: "completed",
  ended_at: @ended_at,
  completed_seconds: completed_seconds,
  active_lock: nil
)
```

---

## 집중 타이머

### Q. 왜 완료 기준이 80%인가?

타이머를 시작하고 앱을 종료해도 시간이 지나면 완료가 되면 안 된다 — 포인트는 실제 집중의 대가다. 그렇다고 100%를 요구하면 몇 초 차이로 기록이 날아가 억울하다. `planned_seconds * 0.8`은 "거의 다 했으면 인정"하는 실용적 절충이다. `paused_seconds`를 빼서 일시정지로 시간을 부풀리는 것도 막았다.

```ruby
# app/services/focus_sessions/complete.rb
MINIMUM_COMPLETION_RATIO = 0.8

@focus_session.lock!
raise InvalidState unless @focus_session.running?
validate_ended_at!

# 실제 집중 시간 = 경과 시간 - 누적 일시정지 시간
completed_seconds = (@ended_at - @focus_session.started_at).floor -
                    @focus_session.paused_seconds
raise TooShort if completed_seconds < minimum_completed_seconds

def minimum_completed_seconds
  (@focus_session.planned_seconds * MINIMUM_COMPLETION_RATIO).ceil
end
```

일시정지 시간은 재개할 때 누적한다.

```ruby
# app/services/focus_sessions/resume.rb
@focus_session.with_lock do
  return @focus_session if @focus_session.running?
  raise InvalidState unless @focus_session.paused?

  added_pause_seconds = (@now - @focus_session.paused_at).floor
  @focus_session.update!(
    status: "running",
    paused_at: nil,
    paused_seconds: @focus_session.paused_seconds + added_pause_seconds
  )
end
```

### Q. 왜 ended_at을 클라이언트가 보내나?

타이머는 기기의 단조 시계(monotonic clock)로 진행한다. 서버가 완료 요청을 받은 시각을 쓰면 네트워크 지연·재시도만큼 시간이 부풀려진다. 대신 서버는 `ended_at`이 시작 이전이거나 미래 60초를 넘으면 거절해 명백한 조작만 차단한다 — 클라이언트 신뢰 + 서버 sanity check.

```ruby
# app/services/focus_sessions/complete.rb
def validate_ended_at!
  now = Time.current
  raise InvalidEndedAt if @ended_at < @focus_session.started_at ||
                          @ended_at > now + 60.seconds
end
```

```ruby
# app/controllers/api/v1/focus_sessions_controller.rb
def parse_ended_at
  raw_value = params[:ended_at].presence
  raw_value ? Time.iso8601(raw_value) : Time.current
rescue ArgumentError
  raise FocusSessions::Complete::InvalidEndedAt
end
```

### Q. 왜 focus 할 일을 0점 task_completion으로 자동 체크하나?

타이머 완료는 이미 `focus_completion` 포인트(+10)를 받았다. "집중 세션" 할 일에도 별도 점수를 주면 이중 지급이다. 대신 완료 이력(체크 표시)만 남기고 점수는 0인 이벤트를 만들어, 사용자는 "할 일 목록도 채워지고" 서버는 "점수는 한 번만"을 동시에 얻는다. idempotency key가 `focus-task-#{session.id}`라 세션당 한 번이다.

```ruby
# app/services/focus_sessions/complete.rb
def record_focus_task_completion(date)
  task = @focus_session.user.task_templates.active_in_order.find do |candidate|
    candidate.kind == "focus" && candidate.scheduled_for?(date)
  end
  return unless task

  completions = task.daily_task_completions.where(completed_on: date)
  return if completions.active.count >= task.target_count

  completion = task.daily_task_completions.create!(
    source_device: @focus_session.source_device,
    completed_on: date,
    sequence: completions.maximum(:sequence).to_i + 1,
    completed_at: @ended_at
  )
  PointEvent.create!(
    user: @focus_session.user,
    daily_task_completion: completion,
    source_device: @focus_session.source_device,
    activity_date: date,
    event_type: "task_completion",
    points: 0,                                  # ← 점수는 0, 체크 표시만
    idempotency_key: "focus-task-#{@focus_session.id}",
    occurred_at: @ended_at
  )
  completion
end
```

### Q. 왜 시작만 해도 first_activity_at을 찍나?

13시 재촉 알림의 목적은 "오늘 시작을 안 했으면 재촉"이다. 타이머를 시작했다는 것 자체가 활동이므로, 완료 전이라도 재촉 대상에서 빠져야 한다. 다만 포인트는 주지 않아서 "시작하고 끄기"로 점수를 파밍할 수 없다 — 활동 인정과 보상을 분리했다.

```ruby
# app/services/focus_sessions/start.rb — 세션 생성 직후
date = @now.in_time_zone("Asia/Seoul").to_date
Points::RecalculateDailySummary.call(date: date, first_activity_at: @now)
```

```ruby
# app/services/points/recalculate_daily_summary.rb
def self.call(date:, first_activity_at: nil)
  summary = DailySummary.find_or_initialize_by(date: date)
  summary.points_total = PointEvent.effective.where(activity_date: date).sum(:points)
  summary.first_activity_at ||= first_activity_at   # 최초 한 번만 기록
  summary.save!
  summary
end
```

---

## 일일 집계 (daily_summaries)

### Q. 왜 집계 테이블을 따로 두나?

홈 화면은 매번 열리고, 원장 전체를 매번 SUM하면 낭비다. 날짜별 집계를 캐시로 두되, 변경이 있을 때마다 **원장에서 다시 계산해 통째로 덮어쓴다**(증분 갱신이 아님). 그래야 취소·보너스·차감이 섞여도 캐시가 드리프트하지 않는다. 캐시는 언제든 버리고 원장에서 다시 만들 수 있는 데이터다.

```ruby
# app/models/daily_summary.rb — PK가 날짜 자체인 단순 캐시 테이블
class DailySummary < ApplicationRecord
  self.primary_key = :date

  validates :date, presence: true
end
```

---

## 보상

### Q. 왜 RewardRule을 사용자별로 두고 매번 동기화하나?

`Setting`은 전역 단일 행이지만 규칙은 `reward_rules`에 사용자별로 복사한다(`SyncDefaultRules`). 설정을 바꾸면 다음 평가 때 규칙이 갱신되고, `RewardAchievement`는 `reward_rule_id`에 매달리므로 "어느 기준으로 달성했는지"가 규칙 행에 남는다. 달성 판정과 설정 조회를 분리하기 위한 정규화다.

```ruby
# app/services/rewards/sync_default_rules.rb
def call
  RewardRule.transaction do
    default_rules.map do |attributes|
      rule = @user.reward_rules.find_or_initialize_by(period: attributes.fetch(:period))
      rule.update!(attributes)   # 설정값이 바뀌면 규칙도 갱신
      rule
    end
  end
end

def default_rules
  [
    { period: "daily",
      required_points: @setting.daily_reward_points,
      reward_text: @setting.daily_reward_text, active: true },
    { period: "weekly",
      required_points: @setting.weekly_reward_points,
      reward_text: @setting.weekly_reward_text, active: true }
  ]
end
```

평가는 매 포인트 변경마다 돌아간다. 일간은 해당일 점수, 주간은 월~일 합산으로 판정한다.

```ruby
# app/services/rewards/evaluate.rb
def call
  rules = SyncDefaultRules.call(user: @user).index_by(&:period)
  achievements = []
  achievements << create_achievement(rules.fetch("daily"), @date.to_s) \
    if daily_points >= rules.fetch("daily").required_points
  achievements << create_achievement(rules.fetch("weekly"), weekly_period_key) \
    if weekly_points >= rules.fetch("weekly").required_points
  Result.new(achievements.compact)
end

def weekly_period_key
  format("%<year>d-W%<week>02d", year: @date.cwyear, week: @date.cweek)  # "2026-W38"
end
```

### Q. 왜 보상 사용을 음수 point_event로 처리하나?

포인트 잔액이라는 별도 상태를 만들면 원장과 불일치할 경로가 생긴다. 차감도 원장 이벤트(`reward_redemption`, -cost)로 넣으면 잔액 = `SUM(effective.points)` 하나로 계산되고, "언제 무엇에 썼는지"가 같은 테이블에서 조회된다. 원장 패턴의 일관된 확장이다.

```ruby
# app/services/rewards/redeem.rb
COSTS = { "cheer" => 100, "recovery" => 200, "reflection" => 300,
          "future" => 400, "growth" => 500 }.freeze

def call
  cost = COSTS.fetch(@reward_kind) { raise UnknownReward }
  PointEvent.transaction do
    existing = PointEvent.lock.find_by(idempotency_key: @idempotency_key)
    return Result.new(RewardRedemption.find_by!(point_event: existing),
                      balance, true) if existing

    raise InsufficientPoints if balance < cost

    event = PointEvent.create!(
      user: @user, source_device: @source_device,
      activity_date: @now.to_date,
      event_type: "reward_redemption",
      points: -cost,                          # ← 차감도 원장 이벤트
      idempotency_key: @idempotency_key,
      occurred_at: @now
    )
    redemption = RewardRedemption.create!(
      user: @user, point_event: event,
      reward_kind: @reward_kind, cost_points: cost, redeemed_at: @now
    )
    Result.new(redemption, balance, false)
  end
end

def balance
  @user.point_events.effective.sum(:points)   # 잔액 = 유효 이벤트 총합
end
```

---

## 실시간 동기화

### Q. 왜 이벤트에 revision 번호를 붙이나?

WebSocket 메시지는 순서가 뒤섞이거나 끊길 수 있다. `settings.sync_revision`을 잠금 증가시켜 모든 이벤트에 단조 증가 번호를 붙이면, 클라이언트가 "빠진 번호"를 감지해 `/dashboard`를 다시 조회할 수 있다. WebSocket은 즉시성용이고 정확성은 REST 재조회가 보장한다 — 푸시는 힌트, 풀은 진실.

```ruby
# app/services/realtime/publish.rb
def call
  revision = Setting.transaction do
    setting = Setting.lock.find(Setting::SINGLETON_ID)
    setting.update!(sync_revision: setting.sync_revision + 1)
    setting.sync_revision                    # 글로벌 단조 증가 카운터
  end
  ActionCable.server.broadcast("tracker", {
    event: @event,
    revision: revision,
    occurred_at: Time.current.iso8601,
    data: @data
  })
  Result.new(revision, @event, occurred_at)
end
```

케이블 연결도 같은 기기 토큰으로 인증한다.

```ruby
# app/channels/application_cable/connection.rb
def find_verified_device
  token = request.params["token"].to_s
  device = Device.active.find_by(
    access_token_digest: Digest::SHA256.hexdigest(token)
  )
  reject_unauthorized_connection unless device

  device.update_column(:last_seen_at, Time.current)
  device
end
```

### Q. 왜 커밋 후에만 방송·잡을 넣나?

서비스는 트랜잭션 안에서 `Result`만 반환하고, 방송(`Realtime::Publish`)과 푸시 잡(`SendRewardNotificationJob.perform_later`)은 컨트롤러가 트랜잭션 밖에서 호출한다. 트랜잭션 안에서 외부로 나가면 롤백 시 "없는 데이터의 이벤트"가 방송된다. Rails의 `after_commit`과 같은 이유다.

```ruby
# app/controllers/api/v1/task_templates/completions_controller.rb
result = Tasks::Complete.call(...)            # ← 트랜잭션은 여기서 커밋됨

revision = unless result.replayed             # ← 커밋 후에만 방송
  Realtime::Publish.call(event: "task.completed", data: { ... }).revision
end
result.reward_achievements.each do |achievement|
  SendRewardNotificationJob.perform_later(achievement.id)   # ← 커밋 후에만 큐잉
end
```

---

## 알림

### Q. 왜 발송 전에 NotificationDelivery 레코드를 먼저 만드나?

푸시 API 호출 자체는 멱등하지 않다. `(device_id, notification_type, schedule_key)` unique로 레코드를 먼저 만들면:

- 같은 날 같은 종류 알림이 두 번 큐에 들어와도 두 번째는 `RecordNotUnique`로 스킵된다.
- 발송 결과(sent/failed)가 행에 남아 "보냈는지"를 나중에 조회할 수 있다.
- 실패해도 재시도하지 않는 정책(재촉은 하루 한 번이 존재 이유지 재발송할 가치가 없음)을 레코드로 강제한다.

```ruby
# app/services/notifications/deliver.rb
def call
  delivery = NotificationDelivery.create!(    # ← 선행 레코드 = 중복 방지 키
    device: @device, notification_type: @notification_type,
    schedule_key: @schedule_key,
    channel: @device.push_channel, title: @title, body: @body
  )
  delivery.update!(attempted_at: Time.current)
  @client.deliver(device: @device, title: @title, body: @body, data: @data)
  delivery.update!(status: "sent", sent_at: Time.current)
  Result.new(delivery, true, false)
rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid
  # 이미 발송된 (device, type, schedule_key) → 스킵
  existing = NotificationDelivery.find_by!(...)
  Result.new(existing, existing.status == "sent", true)
rescue PushClient::DeliveryError => error
  delivery.update!(status: "failed", failed_at: Time.current,
                   error_message: error.message)   # 실패 기록 후 재시도 없음
  Result.new(delivery, false, false)
end
```

### Q. 왜 재촉 작업을 매분 돌리나?

Solid Queue 반복 작업의 최소 단위가 분이라서, 매분 실행하되 서비스 안에서 정확한 시각만 통과시킨다. 크론 표현식으로 "13:00"을 쓰는 대신 설정값과 비교하므로, 사용자가 재촉 시각을 바꿔도 스케줄을 바꿀 필요가 없다.

```yaml
# config/recurring.yml
production:
  daily_nudge:
    class: SendDailyNudgeJob
    queue: notifications
    schedule: every minute
```

```ruby
# app/services/notifications/daily_nudge.rb
def call
  setting = Setting.instance
  local_now = @now.in_time_zone(Setting::TIMEZONE)     # KST 고정
  return [] unless setting.nudge_enabled? &&
                   local_now.strftime("%H:%M") == setting.nudge_at   # 정각만 통과

  date = local_now.to_date
  return [] if DailySummary.find_by(date: date)&.first_activity_at.present?

  Device.find_each.filter_map do |device|
    next unless device.push_channel
    Deliver.call(device: device, notification_type: "daily_nudge",
                 schedule_key: date.to_s, title: TITLE, body: BODY,
                 data: { date: date.to_s }, client: @client)
  end
end
```

푸시 채널은 기기가 등록한 구독 정보로 자동 선택된다.

```ruby
# app/models/device.rb
def push_channel
  return "expo" if expo_push_token.present?
  return "web_push" if web_push_subscription.present?
end
```

```ruby
# app/services/notifications/push_client.rb
case device.push_channel
when "expo"     then deliver_expo(device.expo_push_token, title, body, data)
when "web_push" then deliver_web_push(device.web_push_subscription_payload, ...)
else raise DeliveryError, "푸시 구독 정보가 없어요."
end
```

---

## 인증·보안

### Q. 왜 토큰 원문 대신 SHA256 해시를 저장하나?

DB가 유출돼도 토큰 원문이 새지 않게 하기 위해서다. 토큰은 256비트 랜덤(`urlsafe_base64(32)`)이라 무차별 대입이 불가능해 솔트 없는 SHA256으로 충분하다 — 솔트는 짧은 비밀번호용이지 고엔트로피 토큰용이 아니다. 원문은 발급 응답 한 번만 반환하고, 연결 해제 시 해시를 재생성해 기존 토큰을 무효화한다.

```ruby
# app/services/devices/activate.rb
token = SecureRandom.urlsafe_base64(32)
device = Device.find_or_initialize_by(installation_id: @installation_id)
device.user ||= User.create!
device.assign_attributes(
  name: @name, platform: @platform,
  access_token_digest: Digest::SHA256.hexdigest(token),   # 해시만 저장
  last_seen_at: Time.current,
  revoked_at: nil
)
device.save!
Result.new(device, token)   # 원문은 이 응답에서만 반환
```

```ruby
# app/controllers/api/v1/base_controller.rb — 모든 보호 API의 인증
def authenticate_device!
  token = request.authorization.to_s.delete_prefix("Bearer ").presence
  digest = Digest::SHA256.hexdigest(token.to_s)
  @current_device = Device.active.find_by(access_token_digest: digest)
  return if @current_device

  render json: { error: { code: "unauthorized", message: "유효한 기기 토큰이 필요해요." } },
         status: :unauthorized
ensure
  @current_device&.update_column(:last_seen_at, Time.current)
end
```

```ruby
# app/controllers/api/v1/device_connections_controller.rb — 연결 해제
def destroy
  current_device.update!(
    revoked_at: Time.current,
    access_token_digest: Digest::SHA256.hexdigest(SecureRandom.urlsafe_base64(32)),
    expo_push_token: nil,
    web_push_subscription: nil
  )
  head :no_content
end
```

### Q. 왜 계정 없이 기기 토큰인가?

1인용 서비스에서 회원가입·비밀번호는 UX 마찰만 키운다. "설치된 기기"가 곧 신원이므로 기기별 장기 토큰이 충분하다. 단, 현재 `activate`에 개인 접속 키 검증이 빠져 있어 API 주소를 아는 누구나 기기를 등록할 수 있다 — 이는 명세 대비 미구현 부분이다.

---

## 데이터·시간

### Q. 왜 날짜는 KST 고정이고 시각은 UTC인가?

"오늘의 할 일"은 사용자의 생활 날짜(Asia/Seoul) 기준이고, DB에 저장되는 순간 시각은 UTC여야 표준 라이브러리와 비교가 안전하다. 귀속 날짜는 항상 서버가 결정해 기기 시차를 무시한다. `Setting.timezone`은 향후 확장 자리지만 현재는 `TIMEZONE` 상수로 고정 검증한다.

```ruby
# app/models/setting.rb
class Setting < ApplicationRecord
  SINGLETON_ID = 1
  TIMEZONE = "Asia/Seoul"

  validates :id, inclusion: { in: [SINGLETON_ID] }   # 단일 행 강제
  validates :timezone, inclusion: { in: [TIMEZONE] }
  # ...

  def self.instance
    find_or_create_by!(id: SINGLETON_ID)
  end
end
```

```ruby
# 날짜 귀속은 모든 서비스에서 동일한 한 줄로 처리
date = @now.in_time_zone("Asia/Seoul").to_date
```

### Q. 왜 SQLite인가?

1인용 소규모 서비스에 별도 DB 서버는 운영 비용만 키운다. WAL 모드면 읽기/쓰기 동시성도 개인 사용 수준에서는 충분하다. 대신 영속 볼륨이 전제고, 트래픽이 커지면 Postgres로 옮기는 게 맞다 — 단일 서버·단일 사용자라는 제약을 명확히 한 선택이다.

---

## 알고 있는 한계 (솔직하게 답할 부분)

| 항목 | 현재 상태 | 이상적 형태 |
| --- | --- | --- |
| `daily_summaries`, `settings`, `sync_revision` | 전역(사용자 구분 없음) | `users` 도입 후 per-user 스코핑 필요 |
| `TrackerChannel` | 글로벌 `"tracker"` 스트림 (`stream_from "tracker"`) | `"tracker:#{user_id}"`로 스코핑 |
| 기기 간 데이터 공유 | activate마다 새 User 생성 (`device.user ||= User.create!`) | 공유 키/QR로 기존 user에 device 연결 |
| activate 접속 키 | 미검증 (installation_id만으로 발급) | `PERSONAL_ACCESS_KEY` 환경변수 비교 |
| 네이티브 앱 realtime | web만 구독 (`Platform.OS !== 'web'`이면 no-op) | iOS/Android도 ActionCable 구독 |

이 표는 "의도한 설계"와 "아직 못 한 부분"을 구분해서 설명할 때 쓴다.
