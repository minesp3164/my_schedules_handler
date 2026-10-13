module History
  class List
    MAXIMUM_DAYS = 31
    Result = Data.define(:from, :to, :days)

    class InvalidRange < StandardError; end

    def self.call(...)
      new(...).call
    end

    def initialize(from:, to:, user:)
      @from = from
      @to = to
      @user = user
    end

    def call
      raise InvalidRange if @to < @from || (@to - @from).to_i >= MAXIMUM_DAYS

      summaries = DailySummary.where(date: @from..@to).index_by(&:date)
      events_by_date = @user.point_events.effective
        .includes(daily_task_completion: :task_template)
        .where(activity_date: @from..@to)
        .order(:occurred_at, :created_at)
        .group_by(&:activity_date)
      focus_seconds_by_date = @user.focus_sessions.focus.completed
        .where(ended_at: @from.beginning_of_day..@to.end_of_day)
        .group_by { |session| session.ended_at.in_time_zone("Asia/Seoul").to_date }
        .transform_values { |sessions| sessions.sum { |session| session.completed_seconds || 0 } }
      away_by_date = @user.task_deferrals.where(from_date: @from..@to)
        .includes(:task_template).group_by(&:from_date)
      incoming_by_date = @user.task_deferrals.where(to_date: @from..@to)
        .group_by(&:to_date)
        .transform_values { |rows| rows.map(&:task_template_id) }
      completions = DailyTaskCompletion.active
        .joins(:task_template)
        .where(task_templates: { user_id: @user.id }, completed_on: @from..@to)
        .group_by { |completion| [completion.task_template_id, completion.completed_on] }

      Result.new(@from, @to, (@from..@to).map do |date|
        summary = summaries[date]
        {
          date: date,
          summary: summary_payload(summary).merge(focus_seconds: focus_seconds_by_date.fetch(date, 0)),
          point_events: events_by_date.fetch(date, []).map { |event| event_payload(event) },
          recap: recap_payload(date, summary, away_by_date, incoming_by_date, completions)
        }
      end)
    end

    private

    # 날짜별 리캡: 목표 달성 여부·완료 진척·회복 패스로 내일 보낸 할 일.
    def recap_payload(date, summary, away_by_date, incoming_by_date, completions)
      away = away_by_date.fetch(date, [])
      tasks = Tasks::Goals.tasks(
        user: @user,
        date: date,
        away_ids: away.map(&:task_template_id),
        incoming_ids: incoming_by_date.fetch(date, [])
      )
      done = tasks.count do |task|
        completions.fetch([task.id, date], []).size >= task.target_count
      end
      {
        tasks_total: tasks.size,
        tasks_done: done,
        goal_achieved: summary.present? && summary.all_goals_completed_at.present?,
        deferred: away.map do |deferral|
          {
            deferral_id: deferral.id,
            task_template_id: deferral.task_template_id,
            title: deferral.task_template.title,
            to_date: deferral.to_date
          }
        end
      }
    end

    def summary_payload(summary)
      return { points_total: 0, first_activity_at: nil, all_goals_completed_at: nil, daily_bonus_awarded: false } unless summary

      summary.slice(:points_total, :first_activity_at, :all_goals_completed_at, :daily_bonus_awarded)
    end

    def event_payload(event)
      event.slice(:id, :event_type, :points, :activity_date, :occurred_at, :reversed_at, :daily_task_completion_id, :focus_session_id).merge(
        source_title: event.daily_task_completion&.task_template&.title,
        source_kind: event.daily_task_completion&.task_template&.kind
      )
    end
  end
end
