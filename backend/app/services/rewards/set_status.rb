module Rewards
  # 회복 패스 보유 기록의 '나중에 사용할게요' <-> '다시 보기' 전이만 허용한다.
  # 실제 사용(status='redeemed')은 할 일 이월(Tasks::Defer)이 성공할 때 거기서 발생한다.
  class SetStatus
    class InvalidTransition < StandardError; end

    ALLOWED = {
      "unlocked" => %w[skipped],
      "skipped" => %w[unlocked]
    }.freeze

    def self.call(...)
      new(...).call
    end

    def initialize(user:, id:, status:)
      @user = user
      @id = id
      @status = status.to_s
    end

    def call
      record = @user.reward_redemptions.find(@id)
      unless record.reward_kind == "recovery" && ALLOWED.fetch(record.status, []).include?(@status)
        raise InvalidTransition
      end

      record.update!(status: @status)
      record
    end
  end
end
