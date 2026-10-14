module Rewards
  # Claim이 만드는 payload 필드 검증. payload 검증 실패도 컨트롤러의 validation_failed로 렌더링되게 한다.
  class ClaimPayload
    FIELDS = {
      "message" => { reward_kind: "cheer", limit: 100 },
      "letter" => { reward_kind: "future", limit: 500 }
    }.freeze

    def self.build(payload, user:, field:)
      config = FIELDS.fetch(field)
      text = payload[field].to_s.strip
      raise ActiveRecord::RecordInvalid, invalid_record(user, config, text) if invalid?(text, config)

      { field => text }
    end

    def self.invalid?(text, config)
      text.blank? || text.length > config.fetch(:limit)
    end
    private_class_method :invalid?

    def self.invalid_record(user, config, text)
      RewardRedemption.new(user: user, reward_kind: config.fetch(:reward_kind)).tap do |record|
        record.errors.add(:payload, :blank) if text.blank?
        record.errors.add(:payload, :too_long) if text.length > config.fetch(:limit)
      end
    end
    private_class_method :invalid_record
  end
end
