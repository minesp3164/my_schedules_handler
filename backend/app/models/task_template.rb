class TaskTemplate < ApplicationRecord
  belongs_to :user
  has_many :daily_task_completions, dependent: :restrict_with_exception

  validates :title, presence: true, length: { maximum: 100 }
  validates :points, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :target_count, numericality: { only_integer: true, greater_than: 0 }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :kind, inclusion: { in: %w[focus algorithm portfolio application custom] }

  scope :active_in_order, -> { where(active: true).order(:position, :created_at) }
end
