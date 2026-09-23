module Rewards
  # 해금형 보상의 현재 상태를 계산한다. 포인트는 차감하지 않는다.
  # - cheer:      이번 주 포인트 >= 100 이면 주 1회 사용 가능
  # - recovery:   누적 적립 >= 200 마다 1회 해금, 최대 1개 보유(효과는 2단계)
  # - reflection: 보유 포인트 >= 300 이면 주간 회고를 점수로 열 수 있다(구매 유일)
  # - future:     누적 적립 >= 400 이면 상시 작성 가능
  # - growth:     누적 적립 >= 500 이면 월 1장, 카드 통계는 서버가 실제 데이터로 계산
  class Unlocks
    THRESHOLDS = {
      "cheer" => 100,
      "recovery" => 200,
      "reflection" => 300,
      "future" => 400,
      "growth" => 500
    }.freeze
    UNITS = {
      "cheer" => "weekly",
      "recovery" => "total",
      "reflection" => "balance",
      "future" => "total",
      "growth" => "total"
    }.freeze

    Result = Data.define(:total_points, :earned_points, :weekly_points, :unlocks)

    def self.call(...)
      new(...).call
    end

    def initialize(user:, date: Date.current)
      @user = user
      @date = date
    end

    def call
      Result.new(balance, earned, weekly_points, THRESHOLDS.keys.map { |kind| state_for(kind) })
    end

    private

    def records
      # association 캐시가 이전 Claim/Unlocks 호출 결과를 남길 수 있으므로 매번 새로 읽는다.
      @records ||= RewardRedemption.where(user: @user).to_a
    end

    def records_for(kind)
      records.select { |record| record.reward_kind == kind }
    end

    def recovery_records
      records_for("recovery")
    end

    def recovery_holds
      recovery_records.select { |record| record.status != "redeemed" }
    end

    def earned
      @earned ||= @user.point_events.effective.where("points > 0").sum(:points)
    end

    def balance
      @balance ||= @user.point_events.effective.sum(:points)
    end

    def weekly_points
      @weekly_points ||= @user.point_events.effective.where(activity_date: week_start..week_end).sum(:points)
    end

    def week_start
      @week_start ||= @date - (@date.cwday - 1)
    end

    def week_end
      @week_end ||= week_start + 6
    end

    def week_key
      @week_key ||= format("%<year>d-W%<week>02d", year: @date.cwyear, week: @date.cweek)
    end

    def month_key
      @month_key ||= @date.strftime("%Y-%m")
    end

    def state_for(kind)
      send(:"#{kind}_state")
    end

    def cheer_state
      record = records_for("cheer").find { |item| item.period_key == week_key }
      unlocked = weekly_points >= THRESHOLDS.fetch("cheer")
      available = unlocked && record.nil?
      build_state("cheer", progress: weekly_points, unlocked: unlocked, available: available,
        reason: reason_for(unlocked, available, record: record), record: record, period_key: week_key)
    end

    def recovery_state
      threshold = THRESHOLDS.fetch("recovery")
      unlocked = earned >= threshold
      hold = recovery_holds.max_by(&:created_at)
      budget = earned / threshold
      available = unlocked && hold.nil? && budget > recovery_records.size
      reason = if !unlocked
        "locked"
      elsif hold
        "held"
      elsif !available
        "limit"
      end
      build_state("recovery", progress: earned, unlocked: unlocked, available: available,
        reason: reason, record: hold)
    end

    def reflection_state
      unlocked = balance >= THRESHOLDS.fetch("reflection")
      build_state("reflection", progress: balance, unlocked: unlocked, available: unlocked,
        reason: reason_for(unlocked, unlocked), record: nil)
    end

    def future_state
      unlocked = earned >= THRESHOLDS.fetch("future")
      build_state("future", progress: earned, unlocked: unlocked, available: unlocked,
        reason: reason_for(unlocked, unlocked), record: nil)
    end

    def growth_state
      record = records_for("growth").find { |item| item.period_key == month_key }
      unlocked = earned >= THRESHOLDS.fetch("growth")
      available = unlocked && record.nil?
      state = build_state("growth", progress: earned, unlocked: unlocked, available: available,
        reason: reason_for(unlocked, available, record: record), record: record, period_key: month_key)
      unlocked ? state.merge(stats: growth_stats) : state
    end

    def reason_for(unlocked, available, record: nil)
      return "locked" unless unlocked
      return nil if available

      record ? "used" : "limit"
    end

    def build_state(kind, progress:, unlocked:, available:, reason:, record:, period_key: nil)
      {
        kind: kind,
        threshold: THRESHOLDS.fetch(kind),
        unit: UNITS.fetch(kind),
        progress: progress,
        unlocked: unlocked,
        available: available,
        reason: reason,
        period_key: period_key,
        record: record
      }
    end

    # 성장 카드에 들어갈 이번 달 실제 기록. payload의 값은 여기서 만든 것을 신뢰한다.
    def growth_stats
      range = @date.beginning_of_month..@date.end_of_month
      focus_seconds = @user.focus_sessions.focus.completed
        .where(ended_at: @date.beginning_of_month.beginning_of_day..@date.end_of_month.end_of_day)
        .sum(:completed_seconds).to_i
      {
        month: month_key,
        focus_minutes: focus_seconds / 60,
        applications: DailyTaskCompletion.active
          .joins(:task_template)
          .where(task_templates: { user_id: @user.id, kind: "application" }, completed_on: range)
          .count,
        goal_days: DailySummary.where(date: range).where.not(all_goals_completed_at: nil).count,
        activity_days: @user.point_events.effective.where(activity_date: range).distinct.count(:activity_date),
        points: @user.point_events.effective.where(activity_date: range).sum(:points)
      }
    end
  end
end
