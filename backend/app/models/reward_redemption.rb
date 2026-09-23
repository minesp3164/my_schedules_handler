class RewardRedemption < ApplicationRecord
  STATUSES = %w[unlocked redeemed skipped].freeze

  attribute :payload, :json, default: {}

  belongs_to :user
  belongs_to :point_event, optional: true

  validates :reward_kind, inclusion: { in: %w[cheer recovery reflection future growth] }
  validates :status, inclusion: { in: STATUSES }
  validates :cost_points, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validates :unlocked_at, presence: true
  validates :redeemed_at, presence: true, if: -> { status == "redeemed" }
  validates :idempotency_key, uniqueness: { scope: :user_id }, allow_nil: true
  validates :period_key, uniqueness: { scope: %i[user_id reward_kind] }, allow_nil: true

  scope :active_holds, -> { where(status: %w[unlocked skipped]) }
  scope :usage, -> { where(status: "redeemed") }
end
