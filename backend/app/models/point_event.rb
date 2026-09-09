class PointEvent < ApplicationRecord
  belongs_to :daily_task_completion, optional: true
  belongs_to :focus_session, optional: true
  belongs_to :source_device, class_name: "Device", optional: true

  validates :activity_date, :event_type, :idempotency_key, :occurred_at, presence: true
  validates :points, numericality: { only_integer: true }
  validates :idempotency_key, uniqueness: true
  validates :event_type, inclusion: { in: %w[task_completion focus_completion daily_bonus adjustment] }

  scope :effective, -> { where(reversed_at: nil) }
end
