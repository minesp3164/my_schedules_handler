module Rewards
  class Evaluate
    Result = Data.define(:achievements)

    def self.call(...)
      new(...).call
    end

    def initialize(date:, user:, achieved_at: Time.current)
      @date = date
      @user = user
      @achieved_at = achieved_at
    end

    def call
      rules = SyncDefaultRules.call(user: @user).index_by(&:period)
      achievements = []
      achievements << create_achievement(rules.fetch("daily"), @date.to_s) if daily_points >= rules.fetch("daily").required_points
      achievements << create_achievement(rules.fetch("weekly"), weekly_period_key) if weekly_points >= rules.fetch("weekly").required_points
      Result.new(achievements.compact)
    end

    private

    def daily_points
      @daily_points ||= @user.point_events.effective.where(activity_date: @date).sum(:points)
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

    def weekly_period_key
      format("%<year>d-W%<week>02d", year: @date.cwyear, week: @date.cweek)
    end

    def create_achievement(rule, period_key)
      return unless rule.active?
      return if RewardAchievement.exists?(reward_rule: rule, period_key: period_key)

      RewardAchievement.create!(reward_rule: rule, period_key: period_key, achieved_at: @achieved_at)
    rescue ActiveRecord::RecordNotUnique
      nil
    rescue ActiveRecord::RecordInvalid => error
      raise unless error.record.is_a?(RewardAchievement) && RewardAchievement.exists?(reward_rule: rule, period_key: period_key)

      nil
    end
  end
end
