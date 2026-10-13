module Points
  # 모든 목표(이월 제외)를 채우면 하루 보너스를 1회 지급한다.
  # Tasks::Complete(완료)와 Tasks::Defer(마지막 할 일 이월) 양쪽이 같은 규칙을 쓴다.
  class DailyBonus
    def self.call(...)
      new(...).call
    end

    def initialize(user:, date:, now:)
      @user = user
      @date = date
      @now = now
    end

    def call
      summary = DailySummary.find_by(date: @date)
      return [nil, summary] if summary.nil? || summary.daily_bonus_awarded?
      return [nil, summary] unless Tasks::Goals.all_completed?(user: @user, date: @date)

      event = PointEvent.create!(
        user: @user,
        activity_date: @date,
        event_type: "daily_bonus",
        points: Setting.instance.daily_bonus_points,
        idempotency_key: "daily-bonus-#{@date}",
        occurred_at: @now
      )
      summary.update!(daily_bonus_awarded: true, all_goals_completed_at: @now)
      [event, Points::RecalculateDailySummary.call(date: @date, first_activity_at: @now)]
    end
  end
end
