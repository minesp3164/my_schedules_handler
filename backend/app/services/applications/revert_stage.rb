module Applications
  # 단계 취소는 기존 완료 취소(Tasks::Revert)와 같은 방식: 이벤트에 reverted_at을 달고
  # 원장 이벤트를 reversed_at으로 되돌린다. 음수 조정 행을 만들지 않으므로 이중 차감이 없다.
  class RevertStage
    def self.call(...)
      new(...).call
    end

    def initialize(stage_event_id:, user:)
      @stage_event_id = stage_event_id
      @user = user
    end

    def call
      ApplicationStageEvent.transaction do
        event = ApplicationStageEvent.lock.find(@stage_event_id)
        # 단계 이벤트는 user_id를 직접 갖지 않으므로 지원 건 소유주로 검증한다.
        raise ActiveRecord::RecordNotFound unless event.application.user_id == @user.id
        return Result.new(event, nil, event.application, false) if event.reverted?

        now = Time.current
        event.update!(reverted_at: now)
        event.point_event.update!(reversed_at: now)
        # 제출 단계가 자동으로 채운 할 일 완료도 함께 되돌린다.
        event.daily_task_completion&.update!(reverted_at: now)

        application = event.application
        # 합격 취소는 자동 전환된 상태만 active로 되돌린다(수동 종결은 유지).
        if event.stage_kind == "pass" && application.status == "accepted"
          application.update!(status: "active")
        end

        summary = Points::RecalculateDailySummary.call(date: event.point_event.activity_date)
        Badges::Evaluate.call(user: @user)
        Result.new(event, summary, application, true)
      end
    end

    Result = Data.define(:stage_event, :daily_summary, :application, :changed)
  end
end
