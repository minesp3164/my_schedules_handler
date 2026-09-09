module History
  class List
    MAXIMUM_DAYS = 31
    Result = Data.define(:from, :to, :days)

    class InvalidRange < StandardError; end

    def self.call(...)
      new(...).call
    end

    def initialize(from:, to:)
      @from = from
      @to = to
    end

    def call
      raise InvalidRange if @to < @from || (@to - @from).to_i >= MAXIMUM_DAYS

      summaries = DailySummary.where(date: @from..@to).index_by(&:date)
      events_by_date = PointEvent.where(activity_date: @from..@to).order(:occurred_at, :created_at).group_by(&:activity_date)

      Result.new(@from, @to, (@from..@to).map do |date|
        summary = summaries[date]
        {
          date: date,
          summary: summary_payload(summary),
          point_events: events_by_date.fetch(date, []).map { |event| event_payload(event) }
        }
      end)
    end

    private

    def summary_payload(summary)
      return { points_total: 0, first_activity_at: nil, all_goals_completed_at: nil, daily_bonus_awarded: false } unless summary

      summary.slice(:points_total, :first_activity_at, :all_goals_completed_at, :daily_bonus_awarded)
    end

    def event_payload(event)
      event.slice(:id, :event_type, :points, :activity_date, :occurred_at, :reversed_at, :daily_task_completion_id, :focus_session_id)
    end
  end
end
