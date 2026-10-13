class ApplicationStage < ApplicationRecord
  KINDS = %w[submission interview pass].freeze
  # 단계 유형별 고정 포인트. 사용자는 단계 이름·추가·삭제만 정하고 점수는 바꿀 수 없다.
  POINTS_BY_KIND = { "submission" => 25, "interview" => 30, "pass" => 100 }.freeze

  belongs_to :user
  has_many :application_stage_events, dependent: :restrict_with_exception

  validates :name, presence: true, length: { maximum: 50 }
  validates :kind, inclusion: { in: KINDS }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  scope :active_in_order, -> { where(active: true).order(:position, :created_at) }

  def points
    POINTS_BY_KIND.fetch(kind)
  end
end
