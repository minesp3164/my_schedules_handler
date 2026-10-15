module Points
  # 목표가 미완료로 돌아간 날의 일일 보너스를 회수한다.
  # - 원장 원칙대로 음수 행이 아니라 reversed_at으로만 취소를 남긴다.
  # - 보너스가 없었거나 목표가 여전히 완료 상태면 아무것도 하지 않는다.
  # - Tasks::Revert(완료 취소)와 Tasks::UndoDefer(이월 되돌리기)가 공용으로 쓴다.
  class RevokeDailyBonus
    def self.call(...)
      new(...).call
    end

    def initialize(user:, date:, now: Time.current)
      @user = user
      @date = date
      @now = now
    end

    def call
      summary = DailySummary.find_by(date: @date)
      return [nil, summary] if summary.nil? || !summary.daily_bonus_awarded?
      return [nil, summary] if Tasks::Goals.all_completed?(user: @user, date: @date)

      event = PointEvent.lock.find_by(
        user: @user, activity_date: @date, event_type: "daily_bonus", reversed_at: nil
      )
      return [nil, summary] if event.nil?

      event.update!(reversed_at: @now)
      # 목표 달성 표시(기록 화면의 goal_achieved)도 함께 되돌린다.
      summary.update!(daily_bonus_awarded: false, all_goals_completed_at: nil)
      [event, Points::RecalculateDailySummary.call(date: @date)]
    end
  end
end
