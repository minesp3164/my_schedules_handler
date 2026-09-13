module Rewards
  class SyncDefaultRules
    def self.call(...)
      new(...).call
    end

    def initialize(user:, setting: Setting.instance)
      @user = user
      @setting = setting
    end

    def call
      RewardRule.transaction do
        default_rules.map do |attributes|
          rule = @user.reward_rules.find_or_initialize_by(period: attributes.fetch(:period))
          rule.update!(attributes)
          rule
        end
      end
    end

    private

    def default_rules
      [
        {
          period: "daily",
          required_points: @setting.daily_reward_points,
          reward_text: @setting.daily_reward_text,
          active: true
        },
        {
          period: "weekly",
          required_points: @setting.weekly_reward_points,
          reward_text: @setting.weekly_reward_text,
          active: true
        }
      ]
    end
  end
end
