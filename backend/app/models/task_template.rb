class TaskTemplate < ApplicationRecord
  belongs_to :user
  has_many :daily_task_completions, dependent: :restrict_with_exception

  attribute :weekdays, :json, default: []

  validates :title, presence: true, length: { maximum: 100 }
  validates :points, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :target_count, numericality: { only_integer: true, greater_than: 0 }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :kind, presence: true, length: { maximum: 30 }
  validate :weekdays_are_valid

  scope :active_in_order, -> { where(active: true).order(:position, :created_at) }

  def scheduled_for?(date)
    weekdays.empty? || weekdays.include?(date.wday)
  end

  private

  def weekdays_are_valid
    return if weekdays.all? { |weekday| weekday.is_a?(Integer) && weekday.between?(0, 6) }

    errors.add(:weekdays, "must contain weekday numbers from 0 to 6")
  end
end
