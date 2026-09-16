class Device < ApplicationRecord
  belongs_to :user
  validates :installation_id, :name, :platform, :access_token_digest, presence: true
  validates :installation_id, :access_token_digest, uniqueness: true
  validates :installation_id, :name, length: { maximum: 100 }
  validates :platform, inclusion: { in: %w[ios android web] }

  has_many :daily_task_completions, foreign_key: :source_device_id, inverse_of: :source_device, dependent: :restrict_with_exception
  has_many :notification_deliveries, dependent: :restrict_with_exception

  scope :active, -> { where(revoked_at: nil) }

  def push_channel
    return "expo" if expo_push_token.present?
    return "web_push" if web_push_subscription.present?
  end

  def web_push_subscription_payload
    JSON.parse(web_push_subscription) if web_push_subscription.present?
  rescue JSON::ParserError
    nil
  end
end
