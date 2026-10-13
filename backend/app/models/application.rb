class Application < ApplicationRecord
  STATUSES = %w[active rejected withdrawn accepted].freeze
  # 종결로 인정하는 수동 상태. 합격(pass)은 단계 완료가 자동으로 전환한다.
  CLOSABLE_STATUSES = %w[rejected withdrawn].freeze

  belongs_to :user
  has_many :application_stage_events, dependent: :restrict_with_exception

  validates :company, presence: true, length: { maximum: 100 }
  validates :title, length: { maximum: 200 }, allow_nil: true
  validates :url, length: { maximum: 500 }, allow_nil: true
  validates :memo, length: { maximum: 500 }, allow_nil: true
  validates :status, inclusion: { in: STATUSES }
  validate :no_duplicate_active_company, on: :create

  scope :in_order, -> { order(created_at: :desc) }

  # 진행 중인 지원은 회사당 하나. 재지원은 불합격·포기로 종결한 뒤에만 가능하다.
  def self.normalize_company(name)
    Company.normalize_name(name)
  end

  def closed?
    status != "active"
  end

  private

  def no_duplicate_active_company
    return unless status == "active"

    key = self.class.normalize_company(company)
    return if key.blank?

    duplicate = user.applications.where(status: "active").any? do |application|
      self.class.normalize_company(application.company) == key
    end
    errors.add(:base, "이미 진행 중인 지원 건이 있어요. 재지원은 종결 후에 기록할 수 있어요.") if duplicate
  end
end
