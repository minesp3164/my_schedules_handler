class NotificationDelivery < ApplicationRecord
  belongs_to :device

  validates :notification_type, :schedule_key, :channel, :status, :title, :body, presence: true
  validates :channel, inclusion: { in: %w[expo web_push] }
  validates :status, inclusion: { in: %w[pending sent failed] }
  validates :schedule_key, uniqueness: { scope: %i[device_id notification_type] }
end
