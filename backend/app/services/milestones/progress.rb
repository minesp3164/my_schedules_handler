module Milestones
  class Progress
    Result = Data.define(:activity_days, :focus_minutes, :completed_tasks, :created_tasks)

    def self.call(...)
      new(...).call
    end

    def initialize(user:)
      @user = user
    end

    def call
      Result.new(
        @user.point_events.effective.distinct.count(:activity_date),
        @user.focus_sessions.focus.completed.sum(:completed_seconds) / 60,
        completed_tasks,
        @user.task_templates.count
      )
    end

    private

    def completed_tasks
      DailyTaskCompletion.active
        .joins(:task_template)
        .where(task_templates: { user_id: @user.id })
        .count
    end
  end
end
