class Company < ApplicationRecord
  before_validation :apply_normalized_name

  validates :name, presence: true, length: { maximum: 100 }
  validates :normalized_name, presence: true, uniqueness: true
  validates :source, presence: true

  # 목록 표기와 사용자 입력을 같은 키로 비교한다.
  # 법인형태 표기(주식회사·(주)·Inc. 등)와 기호를 비우고 남는 글자만 키로 쓴다.
  def self.normalize_name(raw)
    raw.to_s
      .downcase
      .gsub(/[（(][^）)]*[）)]/, " ")
      .gsub(/주식회사|유한회사|유한책임회사|사단법인|재단법인/, " ")
      .gsub(/\b(inc|corp|corporation|ltd|llc|co|company|limited)\b/, " ")
      .gsub(/[^0-9a-z가-힣]/, "")
  end

  private

  def apply_normalized_name
    self.normalized_name = self.class.normalize_name(name) if normalized_name.blank?
  end
end
