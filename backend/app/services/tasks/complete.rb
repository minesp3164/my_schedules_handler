module Tasks
  class Complete
    Result = Data.define(:completion, :point_events, :daily_summary, :reward_achievements, :replayed)

    class TargetAlreadyMet < StandardError; end
    class InactiveTask < StandardError; end

    def self.call(...)
      new(...).call
    end

    def initialize(task_template_id:, source_device:, idempotency_key:, now: Time.current)
      @task_template_id = task_template_id
      @source_device = source_device
      @idempotency_key = idempotency_key.presence || raise(ActiveRecord::RecordInvalid.new(PointEvent.new))
      @now = now
    end

    def call
      existing = PointEvent.find_by(idempotency_key: @idempotency_key)
      return replay(existing) if existing

      PointEvent.transaction do
        existing = PointEvent.lock.find_by(idempotency_key: @idempotency_key)
        return replay(existing) if existing

        task = @source_device.user.task_templates.lock.find(@task_template_id)
        date = @now.in_time_zone("Asia/Seoul").to_date
        goals = Goals.tasks(user: @source_device.user, date: date)
        raise InactiveTask unless task.active? && goals.any? { |goal| goal.id == task.id }
        completions_for_day = task.daily_task_completions.where(completed_on: date)
        completed_count = completions_for_day.active.count
        raise TargetAlreadyMet if completed_count >= task.target_count

        completion = task.daily_task_completions.create!(
          source_device: @source_device,
          completed_on: date,
          sequence: completions_for_day.maximum(:sequence).to_i + 1,
          completed_at: @now
        )
        event = PointEvent.create!(
          user: @source_device.user,
          daily_task_completion: completion,
          source_device: @source_device,
          activity_date: date,
          event_type: "task_completion",
          points: task.points,
          idempotency_key: @idempotency_key,
          occurred_at: @now
        )

        summary = Points::RecalculateDailySummary.call(date: date, first_activity_at: @now)
        events = [event]
        bonus, summary = Points::DailyBonus.call(user: @source_device.user, date: date, now: @now)
        events << bonus if bonus

        rewards = Rewards::Evaluate.call(date: date, achieved_at: @now, user: @source_device.user)
        Result.new(completion, events, summary, rewards.achievements, false)
      end
    end

    private

    def replay(event)
      completion = event.daily_task_completion
      summary = DailySummary.find_by!(date: event.activity_date)
      Result.new(completion, [event], summary, [], true)
    end
  end
end
