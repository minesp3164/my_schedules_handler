class BadgeRule < ApplicationRecord
  METRICS = %w[
    activity_days focus_minutes completed_tasks created_tasks
    application_completions algorithm_completions portfolio_completions
  ].freeze
  CATEGORIES = %w[routine steady focus apply algorithm portfolio].freeze

  has_many :badge_achievements, dependent: :restrict_with_exception

  validates :key, presence: true, uniqueness: true
  validates :category, inclusion: { in: CATEGORIES }
  validates :metric, inclusion: { in: METRICS }
  validates :threshold, numericality: { only_integer: true, greater_than: 0 }
  validates :title, :description, presence: true
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
end
