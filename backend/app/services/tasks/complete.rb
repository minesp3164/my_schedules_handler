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

        task = TaskTemplate.lock.find(@task_template_id)
        raise InactiveTask unless task.active?

        date = @now.in_time_zone("Asia/Seoul").to_date
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
        if all_goals_completed?(date) && !summary.daily_bonus_awarded?
          bonus = PointEvent.create!(
            activity_date: date,
            event_type: "daily_bonus",
            points: Setting.instance.daily_bonus_points,
            idempotency_key: "daily-bonus-#{date}",
            occurred_at: @now
          )
          summary.update!(daily_bonus_awarded: true, all_goals_completed_at: @now)
          summary = Points::RecalculateDailySummary.call(date: date, first_activity_at: @now)
          events << bonus
        end

        rewards = Rewards::Evaluate.call(date: date, achieved_at: @now)
        Result.new(completion, events, summary, rewards.achievements, false)
      end
    end

    private

    def replay(event)
      completion = event.daily_task_completion
      summary = DailySummary.find_by!(date: event.activity_date)
      Result.new(completion, [event], summary, [], true)
    end

    def all_goals_completed?(date)
      TaskTemplate.active_in_order.all? do |task|
        task.daily_task_completions.active.where(completed_on: date).count >= task.target_count
      end
    end
  end
end
