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

      event = PointEvent.lock.find_by(idempotency_key: "daily-bonus-#{@date}")
      if event.nil?
        event = PointEvent.create!(
          user: @user,
          activity_date: @date,
          event_type: "daily_bonus",
          points: Setting.instance.daily_bonus_points,
          idempotency_key: "daily-bonus-#{@date}",
          occurred_at: @now
        )
      elsif event.reversed_at?
        # RevokeDailyBonus로 회수됐던 보너스는 같은 날 다시 채우면 같은 원장 행을 다시 쓴다.
        # idempotency_key가 하루 1회로 묶여 있어 행을 새로 만들 수 없기 때문이다.
        event.update!(reversed_at: nil, occurred_at: @now)
      end
      summary.update!(daily_bonus_awarded: true, all_goals_completed_at: @now)
      [event, Points::RecalculateDailySummary.call(date: @date, first_activity_at: @now)]
    end
  end
end
