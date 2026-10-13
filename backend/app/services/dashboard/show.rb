module Dashboard
  class Show
    Result = Data.define(:date, :daily_summary, :total_points, :tasks, :focus_session, :rewards, :deferrals, :applications)

    def self.call(...)
      new(...).call
    end

    def initialize(date:, user:)
      @date = date
      @user = user
    end

    def call
      goal_tasks = Tasks::Goals.tasks(user: @user, date: @date)
      incoming_ids = TaskDeferral.incoming_ids(@date)
      completions_by_task = DailyTaskCompletion.active
        .where(task_template_id: goal_tasks.map(&:id), completed_on: @date)
        .order(:sequence)
        .group_by(&:task_template_id)

      task_payloads = goal_tasks.map do |task|
        task_payload(task, completions_by_task.fetch(task.id, []), deferred_in: incoming_ids.include?(task.id))
      end
      task_payloads << focus_completion_payload if task_payloads.none? { |task| !task.fetch(:goal_completed) } && completed_focus_sessions_count.positive?

      Result.new(
        @date,
        DailySummary.find_by(date: @date),
        PointEvent.effective.where(user: @user).sum(:points),
        task_payloads,
        FocusSession.active.where(user: @user).order(created_at: :desc).first,
        Rewards::Progress.call(date: @date, user: @user),
        deferral_payloads,
        application_summary
      )
    end

    private

    # 홈의 "진행 중인 지원" 카드용 한 줄 요약. 상세는 지원 현황 화면이 맡는다.
    def application_summary
      active = @user.applications.where(status: "active").order(created_at: :desc)
      {
        active_count: active.count,
        recent: active.limit(2).map { |application| { id: application.id, company: application.company } }
      }
    end

    def task_payload(task, completions, deferred_in: false)
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
          completion.slice(:id, :sequence, :completed_at, :note, :note_verified).merge(
            # 지원 단계 기록이 자동으로 채운 완료는 지원 현황에서만 되돌릴 수 있다.
            stage_backed: completion.application_stage_event_id.present?
          )
        end,
        read_only: false,
        deferred_in: deferred_in
      }
    end

    # 오늘 목표에서 이월로 떠난 할 일. 홈에서 "내일로 보낸 할 일"로 보여준다.
    def deferral_payloads
      TaskDeferral.from_day(@date).includes(:task_template).map do |deferral|
        {
          deferral_id: deferral.id,
          task_template_id: deferral.task_template_id,
          title: deferral.task_template.title,
          from_date: deferral.from_date,
          to_date: deferral.to_date
        }
      end
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
