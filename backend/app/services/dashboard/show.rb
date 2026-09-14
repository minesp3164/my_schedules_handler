module Dashboard
  class Show
    Result = Data.define(:date, :daily_summary, :tasks, :focus_session, :rewards)

    def self.call(...)
      new(...).call
    end

    def initialize(date:, user:)
      @date = date
      @user = user
    end

    def call
      tasks = @user.task_templates.active_in_order.select { |task| task.scheduled_for?(@date) }
      completions_by_task = DailyTaskCompletion.active
        .where(task_template_id: tasks.map(&:id), completed_on: @date)
        .order(:sequence)
        .group_by(&:task_template_id)

      Result.new(
        @date,
        DailySummary.find_by(date: @date),
        tasks.map { |task| task_payload(task, completions_by_task.fetch(task.id, [])) },
        FocusSession.active.where(user: @user).order(created_at: :desc).first,
        Rewards::Progress.call(date: @date, user: @user)
      )
    end

    private

    def task_payload(task, completions)
      {
        id: task.id,
        title: task.title,
        kind: task.kind,
        weekdays: task.weekdays,
        points: task.points,
        target_count: task.target_count,
        position: task.position,
        completed_count: completions.size,
        remaining_count: [task.target_count - completions.size, 0].max,
        goal_completed: completions.size >= task.target_count,
        completions: completions.map do |completion|
          completion.slice(:id, :sequence, :completed_at)
        end
      }
    end
  end
end
