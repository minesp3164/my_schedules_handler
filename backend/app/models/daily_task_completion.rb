class DailyTaskCompletion < ApplicationRecord
  belongs_to :task_template
  belongs_to :source_device, class_name: "Device"
  # 지원 단계 기록이 자동으로 채운 완료는 원장 이벤트 대신 이 연결로 근거를 남긴다.
  belongs_to :application_stage_event, optional: true
  has_one :point_event, dependent: :restrict_with_exception

  validates :completed_on, :completed_at, :sequence, presence: true
  validates :sequence, numericality: { only_integer: true, greater_than: 0 }
  # 블로그 글 URL도 note에 남기므로 100자보다 넉넉하게 받는다.
  validates :note, length: { maximum: 500 }

  scope :active, -> { where(reverted_at: nil) }
end
