module Tasks
  # 회복 패스(unlocked 상태 1개)를 사용해 오늘의 할 일 하나를 내일로 옮긴다.
  # - 이월된 할 일은 오늘의 목표에서 빠지고, 내일 스케줄이 아니어도 등장한다(Goals 규칙).
  # - 할 일의 완료 기록은 이월되지 않는다(오늘 안 한 것은 오늘 것으로 남는다).
  # - 오늘 안에는 UndoDefer로 되돌릴 수 있으며 회복 패스도 함께 복구된다.
  class Defer
    Result = Data.define(:deferral, :redemption, :daily_summary, :bonus_event, :replayed)

    class RecoveryRequired < StandardError; end
    class NotEligible < StandardError; end

    def self.call(...)
      new(...).call
    end

    def initialize(user:, task_template_id:, date: nil, now: Time.current)
      @user = user
      @task_template_id = task_template_id
      @now = now
      @date = date || now.in_time_zone("Asia/Seoul").to_date
    end

    def call
      existing = TaskDeferral.find_by(task_template_id: @task_template_id, from_date: @date)
      return replay(existing) if existing

      TaskDeferral.transaction do
        existing = TaskDeferral.lock.find_by(task_template_id: @task_template_id, from_date: @date)
        return replay(existing) if existing

        task = @user.task_templates.lock.find(@task_template_id)
        goals = Goals.tasks(user: @user, date: @date)
        raise NotEligible unless task.active? && goals.any? { |goal| goal.id == task.id }
        raise NotEligible if completed_count(task) >= task.target_count

        hold = RewardRedemption.lock
          .where(user: @user, reward_kind: "recovery", status: "unlocked")
          .order(unlocked_at: :desc)
          .first
        raise RecoveryRequired unless hold

        deferral = TaskDeferral.create!(
          user: @user,
          task_template: task,
          from_date: @date,
          to_date: @date + 1,
          reward_redemption: hold
        )
        hold.update!(
          status: "redeemed",
          redeemed_at: @now,
          payload: hold.payload.merge(
            "task_template_id" => task.id,
            "task_title" => task.title,
            "from_date" => @date.iso8601,
            "to_date" => (@date + 1).iso8601
          )
        )

        bonus, summary = Points::DailyBonus.call(user: @user, date: @date, now: @now)
        Result.new(deferral, hold, summary, bonus, false)
      end
    rescue ActiveRecord::RecordNotUnique
      deferral = TaskDeferral.find_by(task_template_id: @task_template_id, from_date: @date)
      raise unless deferral

      replay(deferral)
    end

    private

    def completed_count(task)
      task.daily_task_completions.active.where(completed_on: @date).count
    end

    def replay(deferral)
      Result.new(deferral, deferral.reward_redemption, DailySummary.find_by(date: @date), nil, true)
    end
  end
end
