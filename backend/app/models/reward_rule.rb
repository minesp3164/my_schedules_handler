class RewardRule < ApplicationRecord
  belongs_to :user
  has_many :reward_achievements, dependent: :restrict_with_exception

  validates :period, inclusion: { in: %w[daily weekly] }, uniqueness: { scope: :user_id }
  validates :required_points, numericality: { only_integer: true, greater_than: 0 }
  validates :reward_text, presence: true, length: { maximum: 200 }
end
