module Rewards
  class Progress
    Result = Data.define(:daily, :weekly)

    def self.call(...)
      new(...).call
    end

    def initialize(date:)
      @date = date
    end

    def call
      rules = SyncDefaultRules.call.index_by(&:period)
      Result.new(
        status_for(rules.fetch("daily"), @date.to_s, daily_points),
        status_for(rules.fetch("weekly"), weekly_period_key, weekly_points)
      )
    end

    private

    def status_for(rule, period_key, points)
      achievement = RewardAchievement.find_by(reward_rule: rule, period_key: period_key)
      {
        period: rule.period,
        period_key: period_key,
        required_points: rule.required_points,
        current_points: points,
        reward_text: rule.reward_text,
        achieved: achievement.present?,
        achieved_at: achievement&.achieved_at
      }
    end

    def daily_points
      @daily_points ||= PointEvent.effective.where(activity_date: @date).sum(:points)
    end

    def weekly_points
      @weekly_points ||= PointEvent.effective.where(activity_date: week_start..week_end).sum(:points)
    end

    def week_start
      @week_start ||= @date - (@date.cwday - 1)
    end

    def week_end
      @week_end ||= week_start + 6
    end

    def weekly_period_key
      format("%<year>d-W%<week>02d", year: @date.cwyear, week: @date.cweek)
    end
  end
end
