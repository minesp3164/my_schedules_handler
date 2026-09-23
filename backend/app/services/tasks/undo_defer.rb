module Tasks
  # 이월을 되돌린다. 효과가 사라지므로 사용한 회복 패스도 되돌려 준다.
  # 시작일(=되돌아올 날)이 오늘인 이월만 허용한다. 날짜가 지난 것은 되돌릴 수 없다.
  class UndoDefer
    Result = Data.define(:deferral, :redemption)

    class NotUndoable < StandardError; end

    RESTORED_PAYLOAD_KEYS = %w[task_template_id task_title from_date to_date].freeze

    def self.call(...)
      new(...).call
    end

    def initialize(user:, id:, date: nil, now: Time.current)
      @user = user
      @id = id
      @now = now
      @date = date || now.in_time_zone("Asia/Seoul").to_date
    end

    def call
      deferral = @user.task_deferrals.find(@id)
      raise NotUndoable unless deferral.from_date == @date

      redemption = deferral.reward_redemption
      restore_pass!(deferral, redemption) if usable_pass?(deferral, redemption)
      deferral.destroy!
      Result.new(deferral, redemption)
    end

    private

    def usable_pass?(deferral, redemption)
      redemption&.status == "redeemed" && redemption.payload["from_date"] == deferral.from_date.iso8601
    end

    def restore_pass!(deferral, redemption)
      redemption.update!(
        status: "unlocked",
        redeemed_at: nil,
        payload: redemption.payload.except(*RESTORED_PAYLOAD_KEYS)
      )
    end
  end
end
