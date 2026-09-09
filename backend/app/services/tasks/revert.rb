module Tasks
  class Revert
    def self.call(completion_id:)
      DailyTaskCompletion.transaction do
        completion = DailyTaskCompletion.lock.find(completion_id)
        return [completion, DailySummary.find_by!(date: completion.completed_on), false] if completion.reverted_at?

        completion.update!(reverted_at: Time.current)
        completion.point_event.update!(reversed_at: Time.current)
        summary = Points::RecalculateDailySummary.call(date: completion.completed_on)
        [completion, summary, true]
      end
    end
  end
end
