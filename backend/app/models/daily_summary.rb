class DailySummary < ApplicationRecord
  self.primary_key = :date

  validates :date, presence: true
end
