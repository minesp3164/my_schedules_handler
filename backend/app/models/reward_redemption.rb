class RewardRedemption < ApplicationRecord
  belongs_to :user
  belongs_to :point_event

  validates :reward_kind, inclusion: { in: %w[cheer recovery reflection future growth] }
  validates :cost_points, numericality: { only_integer: true, greater_than: 0 }
  validates :redeemed_at, presence: true
end
