class RewardAchievement < ApplicationRecord
  belongs_to :reward_rule

  validates :period_key, :achieved_at, presence: true
  validates :period_key, uniqueness: { scope: :reward_rule_id }
end
