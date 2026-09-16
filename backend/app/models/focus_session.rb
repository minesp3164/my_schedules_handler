class FocusSession < ApplicationRecord
  belongs_to :user
  MINIMUM_PLANNED_SECONDS = 10
  MAXIMUM_PLANNED_SECONDS = 7200

  belongs_to :source_device, class_name: "Device"
  has_one :point_event, dependent: :restrict_with_exception

  KINDS = %w[focus break].freeze

  enum :status, { running: "running", paused: "paused", completed: "completed", cancelled: "cancelled" }, validate: true

  validates :started_at, :planned_seconds, :status, :kind, :start_idempotency_key, presence: true
  validates :kind, inclusion: { in: KINDS }
  validates :planned_seconds, numericality: { only_integer: true, in: MINIMUM_PLANNED_SECONDS..MAXIMUM_PLANNED_SECONDS }
  validates :paused_seconds, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :completed_seconds, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true
  validates :status, inclusion: { in: %w[running paused completed cancelled] }
  validates :start_idempotency_key, uniqueness: true

  scope :active, -> { where(status: %w[running paused]) }
  scope :focus, -> { where(kind: "focus") }

  def break?
    kind == "break"
  end

  def scheduled_end_at
    started_at + (planned_seconds + paused_seconds).seconds
  end
end
