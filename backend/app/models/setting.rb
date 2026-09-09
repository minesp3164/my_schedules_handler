class Setting < ApplicationRecord
  SINGLETON_ID = 1
  TIMEZONE = "Asia/Seoul"
  TIME_OF_DAY_FORMAT = /\A(?:[01]\d|2[0-3]):[0-5]\d\z/

  validates :id, inclusion: { in: [SINGLETON_ID] }
  validates :focus_minutes, :break_minutes, numericality: { only_integer: true, in: 1..120 }
  validates :focus_completion_points, :daily_bonus_points, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :daily_reward_points, :weekly_reward_points, numericality: { only_integer: true, greater_than: 0 }
  validates :nudge_at, format: { with: TIME_OF_DAY_FORMAT }
  validates :timezone, inclusion: { in: [TIMEZONE] }
  validates :daily_reward_text, :weekly_reward_text, presence: true, length: { maximum: 200 }

  def self.instance
    find_or_create_by!(id: SINGLETON_ID)
  end

  after_commit :sync_default_reward_rules, on: %i[create update], if: :reward_configuration_changed?

  private

  def sync_default_reward_rules
    Rewards::SyncDefaultRules.call(setting: self)
  end

  def reward_configuration_changed?
    previous_changes.slice("daily_reward_points", "weekly_reward_points", "daily_reward_text", "weekly_reward_text").present?
  end
end
