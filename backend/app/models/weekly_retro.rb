class WeeklyRetro < ApplicationRecord
  BODY_MAX_LENGTH = 500

  belongs_to :user

  validates :week_start, :body, presence: true
  validates :body, length: { maximum: BODY_MAX_LENGTH }
  validates :week_start, uniqueness: { scope: :user_id }
end
