module Applications
  # 지원 단계 완료는 지원 포인트의 유일한 경로다. 단계를 기록하지 않으면 포인트도 없다.
  # 제출(submission) 단계는 그날의 "실제 지원" 할 일 완료도 함께 채워 일일 목표 루프에 편입되지만,
  # 이 자동 완료는 원장 이벤트를 만들지 않으므로 포인트는 단계 마일스톤에서만 한 번 지급된다.
  class RecordStage
    Result = Data.define(:application, :stage_event, :point_events, :completion, :daily_summary, :reward_achievements, :replayed)

    class StageAlreadyRecorded < StandardError; end
    class InactiveStage < StandardError; end
    class ApplicationClosed < StandardError; end

    def self.call(...)
      new(...).call
    end

    def initialize(application_id:, application_stage_id:, source_device:, idempotency_key:, now: Time.current)
      @application_id = application_id
      @application_stage_id = application_stage_id
      @source_device = source_device
      @idempotency_key = idempotency_key.presence || raise(ActiveRecord::RecordInvalid.new(ApplicationStageEvent.new))
      @now = now
    end

    def call
      existing = ApplicationStageEvent.find_by(idempotency_key: @idempotency_key)
      return replay(existing) if existing

      create_event
    rescue ActiveRecord::RecordNotUnique
      # 동시 요청이 같은 단계를 파고들면 유니크 인덱스가 마지막 방어선이 된다.
      raise StageAlreadyRecorded
    end

    private

    def create_event
      ApplicationStageEvent.transaction do
        existing = ApplicationStageEvent.lock.find_by(idempotency_key: @idempotency_key)
        return replay(existing) if existing

        user = @source_device.user
        application = user.applications.lock.find(@application_id)
        raise ApplicationClosed unless application.status == "active"

        stage = user.application_stages.find(@application_stage_id)
        raise InactiveStage unless stage.active?
        raise StageAlreadyRecorded if duplicate_stage?(application, stage)

        date = @now.in_time_zone("Asia/Seoul").to_date
        event = application.application_stage_events.create!(
          application_stage: stage,
          stage_kind: stage.kind,
          source_device: @source_device,
          completed_on: date,
          completed_at: @now,
          idempotency_key: @idempotency_key
        )
        milestone = PointEvent.create!(
          user: user,
          application_stage_event: event,
          source_device: @source_device,
          activity_date: date,
          event_type: "application_milestone",
          points: stage.points,
          idempotency_key: @idempotency_key,
          occurred_at: @now
        )

        completion = create_submission_completion(user, application, event)

        summary = Points::RecalculateDailySummary.call(date: date, first_activity_at: @now)
        events = [milestone]
        bonus, summary = Points::DailyBonus.call(user: user, date: date, now: @now)
        events << bonus if bonus

        rewards = Rewards::Evaluate.call(date: date, achieved_at: @now, user: user)
        Badges::Evaluate.call(user: user, now: @now)
        # 합격 단계는 지원 건을 자동으로 합격 처리한다(수동 종결 상태는 덮어쓰지 않는다).
        application.update!(status: "accepted") if stage.kind == "pass" && application.status == "active"

        Result.new(application.reload, event, events, completion, summary, rewards.achievements, false)
      end
    end

    def replay(event)
      summary = DailySummary.find_by(date: event.point_event.activity_date)
      Result.new(event.application, event, [event.point_event].compact, event.daily_task_completion, summary, [], true)
    end

    # 제출 단계는 그날 목표의 application 종류 할 일 완료 1회로 자동 인정된다.
    # 목표 횟수는 기존 규칙(target_count)을 그대로 지킨다.
    def create_submission_completion(user, application, event)
      return unless event.stage_kind == "submission"

      task = Tasks::Goals.tasks(user: user, date: event.completed_on).find { |goal| goal.kind == "application" }
      return unless task

      completions_for_day = task.daily_task_completions.where(completed_on: event.completed_on)
      return if completions_for_day.active.count >= task.target_count

      note, note_verified = verified_company_name(application.company)
      task.daily_task_completions.create!(
        source_device: @source_device,
        application_stage_event: event,
        completed_on: event.completed_on,
        sequence: completions_for_day.maximum(:sequence).to_i + 1,
        completed_at: @now,
        note: note,
        note_verified: note_verified
      )
    end

    # 목록에서 확인된 회사면 정본 이름과 실존 확인 표시를 남긴다(기존 할 일 완료와 같은 규칙).
    def verified_company_name(company_name)
      company = Company.find_by(normalized_name: Company.normalize_name(company_name))
      return [company_name, false] unless company

      [company.name, true]
    end

    # 같은 단계는 지원 건당 1회. 제출·합격은 유형 기준으로도 1회(면접만 반복 허용).
    def duplicate_stage?(application, stage)
      active_events = application.application_stage_events.active
      return true if active_events.exists?(application_stage_id: stage.id)
      return false unless %w[submission pass].include?(stage.kind)

      active_events.exists?(stage_kind: stage.kind)
    end
  end
end
