module Rewards
  class Redeem
    COSTS = { "cheer" => 100, "recovery" => 200, "reflection" => 300, "future" => 400, "growth" => 500 }.freeze
    Result = Data.define(:redemption, :remaining_points, :replayed)

    class InsufficientPoints < StandardError; end
    class UnknownReward < StandardError; end

    def self.call(...)
      new(...).call
    end

    def initialize(user:, source_device:, reward_kind:, idempotency_key:, payload: {}, now: Time.current)
      @user = user
      @source_device = source_device
      @reward_kind = reward_kind
      @payload = payload.is_a?(Hash) ? payload : {}
      @idempotency_key = idempotency_key.presence || raise(ActiveRecord::RecordInvalid.new(PointEvent.new))
      @now = now
    end

    def call
      cost = COSTS.fetch(@reward_kind) { raise UnknownReward }
      PointEvent.transaction do
        existing = PointEvent.lock.find_by(idempotency_key: @idempotency_key)
        return Result.new(RewardRedemption.find_by!(point_event: existing), balance, true) if existing

        raise InsufficientPoints if balance < cost

        event = PointEvent.create!(
          user: @user, source_device: @source_device, activity_date: @now.to_date,
          event_type: "reward_redemption", points: -cost, idempotency_key: @idempotency_key, occurred_at: @now
        )
        redemption = RewardRedemption.create!(user: @user, point_event: event, reward_kind: @reward_kind, cost_points: cost, redeemed_at: @now, payload: @payload)
        Result.new(redemption, balance, false)
      end
    end

    private

    def balance
      @user.point_events.effective.sum(:points)
    end
  end
end
