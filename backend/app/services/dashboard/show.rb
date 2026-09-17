module Dashboard
  class Show
    Result = Data.define(:date, :daily_summary, :total_points, :tasks, :focus_session, :rewards)

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

      task_payloads = tasks.map { |task| task_payload(task, completions_by_task.fetch(task.id, [])) }
      task_payloads << focus_completion_payload if task_payloads.none? { |task| !task.fetch(:goal_completed) } && completed_focus_sessions_count.positive?

      Result.new(
        @date,
        DailySummary.find_by(date: @date),
        PointEvent.effective.where(user: @user).sum(:points),
        task_payloads,
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
        end,
        read_only: false
      }
    end

    def completed_focus_sessions_count
      @completed_focus_sessions_count ||=
        @user.focus_sessions.focus.where(status: "completed", ended_at: @date.all_day).count
    end

    def focus_completion_payload
      count = completed_focus_sessions_count
      {
        id: "focus-completion-#{@date}",
        title: "집중 25분 완료",
        kind: "focus",
        weekdays: [],
        points: 0,
        target_count: count,
        position: 999_999,
        completed_count: count,
        remaining_count: 0,
        goal_completed: true,
        completions: [],
        read_only: true
      }
    end
  end
end
