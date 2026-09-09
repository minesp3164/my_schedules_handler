module FocusSessions
  class Start
    Result = Data.define(:focus_session, :replayed)

    class ActiveFocusSessionExists < StandardError; end

    def self.call(...)
      new(...).call
    end

    def initialize(source_device:, planned_seconds:, idempotency_key:, now: Time.current)
      @source_device = source_device
      @planned_seconds = planned_seconds
      @idempotency_key = idempotency_key.presence || raise(ActiveRecord::RecordInvalid.new(FocusSession.new))
      @now = now
    end

    def call
      existing = FocusSession.find_by(start_idempotency_key: @idempotency_key)
      return Result.new(existing, true) if existing

      FocusSession.transaction do
        existing = FocusSession.lock.find_by(start_idempotency_key: @idempotency_key)
        return Result.new(existing, true) if existing
        raise ActiveFocusSessionExists if FocusSession.active.lock.exists?

        session = FocusSession.create!(
          source_device: @source_device,
          started_at: @now,
          planned_seconds: @planned_seconds,
          status: "running",
          paused_seconds: 0,
          active_lock: 1,
          start_idempotency_key: @idempotency_key
        )
        date = @now.in_time_zone("Asia/Seoul").to_date
        Points::RecalculateDailySummary.call(date: date, first_activity_at: @now)
        Result.new(session, false)
      end
    end
  end
end
