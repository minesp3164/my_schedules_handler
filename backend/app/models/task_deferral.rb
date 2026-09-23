class TaskDeferral < ApplicationRecord
  belongs_to :user
  belongs_to :task_template
  belongs_to :reward_redemption, optional: true

  validates :from_date, :to_date, presence: true
  validates :to_date, comparison: { greater_than: :from_date }
  validates :task_template_id, uniqueness: { scope: :from_date }

  scope :from_day, ->(date) { where(from_date: date) }
  scope :to_day, ->(date) { where(to_date: date) }

  def self.away_ids(date)
    from_day(date).pluck(:task_template_id)
  end

  def self.incoming_ids(date)
    to_day(date).pluck(:task_template_id)
  end
end
