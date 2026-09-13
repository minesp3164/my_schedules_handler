module FocusSessions
  class Complete
    MINIMUM_COMPLETION_RATIO = 0.8
    Result = Data.define(:focus_session, :point_event, :daily_summary, :reward_achievements, :replayed)

    class InvalidState < StandardError; end
    class TooShort < StandardError; end
    class InvalidEndedAt < StandardError; end

    def self.call(...)
      new(...).call
    end

    def initialize(focus_session:, idempotency_key:, ended_at: Time.current)
      @focus_session = focus_session
      @idempotency_key = idempotency_key.presence || raise(ActiveRecord::RecordInvalid.new(PointEvent.new))
      @ended_at = ended_at
    end

    def call
      existing = PointEvent.find_by(idempotency_key: @idempotency_key)
      return replay(existing) if existing

      FocusSession.transaction do
        @focus_session.lock!
        existing_event = @focus_session.point_event
        return replay(existing_event) if existing_event
        raise InvalidState unless @focus_session.running?
        validate_ended_at!

        completed_seconds = (@ended_at - @focus_session.started_at).floor - @focus_session.paused_seconds
        raise TooShort if completed_seconds < minimum_completed_seconds

        @focus_session.update!(
          status: "completed",
          ended_at: @ended_at,
          completed_seconds: completed_seconds,
          active_lock: nil
        )
        date = @ended_at.in_time_zone("Asia/Seoul").to_date
        event = PointEvent.create!(
          user: @focus_session.user,
          focus_session: @focus_session,
          source_device: @focus_session.source_device,
          activity_date: date,
          event_type: "focus_completion",
          points: Setting.instance.focus_completion_points,
          idempotency_key: @idempotency_key,
          occurred_at: @ended_at
        )
        summary = Points::RecalculateDailySummary.call(date: date, first_activity_at: @focus_session.started_at)
        rewards = Rewards::Evaluate.call(date: date, achieved_at: @ended_at, user: @focus_session.user)
        Result.new(@focus_session, event, summary, rewards.achievements, false)
      end
    end

    private

    def replay(event)
      Result.new(event.focus_session, event, DailySummary.find_by!(date: event.activity_date), [], true)
    end

    def validate_ended_at!
      now = Time.current
      raise InvalidEndedAt if @ended_at < @focus_session.started_at || @ended_at > now + 60.seconds
    end

    def minimum_completed_seconds
      (@focus_session.planned_seconds * MINIMUM_COMPLETION_RATIO).ceil
    end
  end
end
