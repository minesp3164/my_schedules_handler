module Milestones
  class Progress
    Result = Data.define(
      :activity_days,
      :focus_minutes,
      :completed_tasks,
      :created_tasks,
      :application_completions,
      :algorithm_completions,
      :portfolio_completions,
      :first_activity_date
    )

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
        @user.task_templates.where(active: true).count,
        completions_for_kind("application"),
        completions_for_kind("algorithm"),
        completions_for_kind("portfolio"),
        @user.point_events.effective.minimum(:activity_date)
      )
    end

    private

    def completed_tasks
      DailyTaskCompletion.active
        .joins(:task_template)
        .where(task_templates: { user_id: @user.id })
        .count
    end

    def completions_for_kind(kind)
      DailyTaskCompletion.active
        .joins(:task_template)
        .where(task_templates: { user_id: @user.id, kind: kind })
        .count
    end
  end
end
