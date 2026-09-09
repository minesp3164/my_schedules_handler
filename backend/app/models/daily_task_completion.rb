class DailyTaskCompletion < ApplicationRecord
  belongs_to :task_template
  belongs_to :source_device, class_name: "Device"
  has_one :point_event, dependent: :restrict_with_exception

  validates :completed_on, :completed_at, :sequence, presence: true
  validates :sequence, numericality: { only_integer: true, greater_than: 0 }

  scope :active, -> { where(reverted_at: nil) }
end
