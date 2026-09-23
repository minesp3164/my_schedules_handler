module Rewards
  # 해금형 보상의 사용/보유 기록을 만든다. 포인트는 차감하지 않는다.
  # - cheer:      이번 주 해금 상태에서 응원 메시지 1회 기록
  # - recovery:   회복 패스 보유(hold) 생성. 실제 사용 효과는 2단계에서 연결한다.
  # - future:     누적 400점 해금 후 편지 쓰기(상시, 제한 없음)
  # - growth:     누적 500점 해금 후 이번 달 카드 1장 저장(통계는 서버 계산)
  # - reflection: 주간 회고 구매(점수 차감)는 Rewards::Redeem 경로를 그대로 쓴다.
  class Claim
    Result = Data.define(:record, :balance, :replayed)

    class Locked < StandardError; end
    class LimitReached < StandardError; end

    def self.call(...)
      new(...).call
    end

    def initialize(user:, reward_kind:, idempotency_key: nil, payload: {}, source_device: nil, date: Date.current)
      @user = user
      @reward_kind = reward_kind.to_s
      @idempotency_key = idempotency_key.presence
      @payload = payload || {}
      @source_device = source_device
      @date = date
      @now = Time.current
    end

    def call
      if (replay = replayed_record)
        return Result.new(replay, balance, true)
      end

      case @reward_kind
      when "cheer" then claim_cheer
      when "recovery" then claim_recovery
      when "future" then claim_future
      when "growth" then claim_growth
      when "reflection" then purchase_reflection
      else
        raise Rewards::Redeem::UnknownReward
      end
    end

    private

    def unlocks
      @unlocks ||= Rewards::Unlocks.call(user: @user, date: @date)
    end

    def state_for(kind)
      unlocks.unlocks.find { |state| state.fetch(:kind) == kind }
    end

    def balance
      unlocks.total_points
    end

    def replayed_record
      return nil unless @idempotency_key

      RewardRedemption.where(user: @user).find_by(idempotency_key: @idempotency_key)
    end

    def claim_cheer
      state = state_for("cheer")
      raise Locked, "cheer" unless state.fetch(:unlocked)
      raise LimitReached, "cheer" if state.fetch(:record)

      create!(reward_kind: "cheer", status: "redeemed", unlocked_at: @now, redeemed_at: @now,
        period_key: state.fetch(:period_key), payload: message_payload)
    end

    def claim_recovery
      state = state_for("recovery")
      raise Locked, "recovery" unless state.fetch(:unlocked)
      raise LimitReached, "recovery" if state.fetch(:record) || !state.fetch(:available)

      create!(reward_kind: "recovery", status: "unlocked", unlocked_at: @now, payload: {})
    end

    def claim_future
      raise Locked, "future" unless state_for("future").fetch(:unlocked)

      create!(reward_kind: "future", status: "redeemed", unlocked_at: @now, redeemed_at: @now,
        payload: letter_payload)
    end

    def claim_growth
      state = state_for("growth")
      raise Locked, "growth" unless state.fetch(:unlocked)
      raise LimitReached, "growth" if state.fetch(:record)

      stats = state.fetch(:stats)
      create!(reward_kind: "growth", status: "redeemed", unlocked_at: @now, redeemed_at: @now,
        period_key: state.fetch(:period_key), payload: @payload.merge("stats" => stats, "month" => stats.fetch(:month)))
    end

    # 주간 회고는 점수로 여는 구매 방식을 유지한다.
    def purchase_reflection
      result = Rewards::Redeem.call(user: @user, source_device: @source_device, reward_kind: "reflection",
        idempotency_key: @idempotency_key || SecureRandom.uuid, payload: @payload)
      Result.new(result.redemption, result.remaining_points, result.replayed)
    end

    def create!(attributes)
      record = RewardRedemption.create!(attributes.merge(user: @user, idempotency_key: @idempotency_key))
      Result.new(record, balance, false)
    rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid => error
      raise unless replayable?(error)

      existing = replayed_record || fallback_record(attributes)
      raise error unless existing

      Result.new(existing, balance, true)
    end

    def replayable?(error)
      return true if error.is_a?(ActiveRecord::RecordNotUnique)

      error.record.is_a?(RewardRedemption) &&
        (error.record.errors.of_kind?(:period_key, :taken) || error.record.errors.of_kind?(:idempotency_key, :taken))
    end

    def fallback_record(attributes)
      period_key = attributes[:period_key]
      return nil unless period_key

      RewardRedemption.where(user: @user)
        .find_by(reward_kind: attributes.fetch(:reward_kind), period_key: period_key)
    end

    def message_payload
      message = @payload["message"].to_s.strip
      raise ActiveRecord::RecordInvalid, message_record(message) if message.blank? || message.length > 100

      { "message" => message }
    end

    def letter_payload
      letter = @payload["letter"].to_s.strip
      raise ActiveRecord::RecordInvalid, letter_record(letter) if letter.blank? || letter.length > 500

      { "letter" => letter }
    end

    # payload 검증 실패도 컨트롤러의 validation_failed로 렌더링되게 한다.
    def message_record(text)
      RewardRedemption.new(user: @user, reward_kind: "cheer").tap do |record|
        record.errors.add(:payload, :blank) if text.blank?
        record.errors.add(:payload, :too_long) if text.length > 100
      end
    end

    def letter_record(text)
      RewardRedemption.new(user: @user, reward_kind: "future").tap do |record|
        record.errors.add(:payload, :blank) if text.blank?
        record.errors.add(:payload, :too_long) if text.length > 500
      end
    end
  end
end
