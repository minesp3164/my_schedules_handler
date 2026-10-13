class User < ApplicationRecord
  has_many :devices, dependent: :restrict_with_exception
  has_many :task_templates, dependent: :restrict_with_exception
  has_many :point_events, dependent: :restrict_with_exception
  has_many :focus_sessions, dependent: :restrict_with_exception
  has_many :reward_rules, dependent: :restrict_with_exception
  has_many :reward_redemptions, dependent: :restrict_with_exception
  has_many :task_deferrals, dependent: :restrict_with_exception
  has_many :weekly_retros, dependent: :destroy
end
