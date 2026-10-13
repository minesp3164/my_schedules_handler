module Tasks
  class Revert
    # 지원 단계 기록이 자동으로 채운 완료는 단계 취소로만 되돌린다.
    # 이 완료는 원장 이벤트가 아니라 단계 이벤트가 점수의 근거이기 때문이다.
    class StageBackedCompletion < StandardError; end

    def self.call(completion_id:)
      DailyTaskCompletion.transaction do
        completion = DailyTaskCompletion.lock.find(completion_id)
        raise StageBackedCompletion if completion.application_stage_event_id?
        return [completion, DailySummary.find_by!(date: completion.completed_on), false] if completion.reverted_at?

        completion.update!(reverted_at: Time.current)
        completion.point_event.update!(reversed_at: Time.current)
        summary = Points::RecalculateDailySummary.call(date: completion.completed_on)
        [completion, summary, true]
      end
    end
  end
end
