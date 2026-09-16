module FocusSessions
  class Complete
    MINIMUM_COMPLETION_RATIO = 0.8
    Result = Data.define(:focus_session, :point_event, :focus_task_completion, :daily_summary, :reward_achievements, :replayed)

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
        return completed_break_result if @focus_session.completed?
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
        return complete_break(date) if @focus_session.break?
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
        focus_task_completion = record_focus_task_completion(date)
        summary = Points::RecalculateDailySummary.call(date: date, first_activity_at: @focus_session.started_at)
        rewards = Rewards::Evaluate.call(date: date, achieved_at: @ended_at, user: @focus_session.user)
        Result.new(@focus_session, event, focus_task_completion, summary, rewards.achievements, false)
      end
    end

    private

    def replay(event)
      Result.new(event.focus_session, event, nil, DailySummary.find_by!(date: event.activity_date), [], true)
    end

    def complete_break(date)
      Result.new(@focus_session, nil, nil, DailySummary.find_by(date: date), [], false)
    end

    def completed_break_result
      Result.new(
        @focus_session,
        nil,
        nil,
        DailySummary.find_by(date: @focus_session.ended_at&.in_time_zone("Asia/Seoul")&.to_date),
        [],
        true
      )
    end

    def validate_ended_at!
      now = Time.current
      raise InvalidEndedAt if @ended_at < @focus_session.started_at || @ended_at > now + 60.seconds
    end

    def minimum_completed_seconds
      (@focus_session.planned_seconds * MINIMUM_COMPLETION_RATIO).ceil
    end

    def record_focus_task_completion(date)
      task = @focus_session.user.task_templates.active_in_order.find do |candidate|
        next false unless candidate.kind == "focus" && candidate.scheduled_for?(date)

        candidate.daily_task_completions.where(completed_on: date).active.count <
          candidate.target_count
      end
      return unless task

      completions = task.daily_task_completions.where(completed_on: date)

      completion = task.daily_task_completions.create!(
        source_device: @focus_session.source_device,
        completed_on: date,
        sequence: completions.maximum(:sequence).to_i + 1,
        completed_at: @ended_at
      )
      PointEvent.create!(
        user: @focus_session.user,
        daily_task_completion: completion,
        source_device: @focus_session.source_device,
        activity_date: date,
        event_type: "task_completion",
        points: 0,
        idempotency_key: "focus-task-#{@focus_session.id}",
        occurred_at: @ended_at
      )
      completion
    end
  end
end
