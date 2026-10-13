class ApplicationStageEvent < ApplicationRecord
  belongs_to :application
  belongs_to :application_stage
  belongs_to :source_device, class_name: "Device"
  has_one :point_event, dependent: :restrict_with_exception
  has_one :daily_task_completion, dependent: :restrict_with_exception

  validates :completed_on, :completed_at, presence: true
  validates :idempotency_key, presence: true, uniqueness: true
  validates :stage_kind, inclusion: { in: ApplicationStage::KINDS }

  scope :active, -> { where(reverted_at: nil) }

  def points
    ApplicationStage::POINTS_BY_KIND.fetch(stage_kind)
  end

  def reverted?
    reverted_at.present?
  end
end
