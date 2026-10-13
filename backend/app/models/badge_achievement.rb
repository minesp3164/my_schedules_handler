class BadgeAchievement < ApplicationRecord
  belongs_to :badge_rule
  belongs_to :user

  validates :achieved_at, presence: true
  validates :badge_rule_id, uniqueness: { scope: :user_id }
end
