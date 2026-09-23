module Tasks
  # 날짜별 "목표 할 일"의 유일한 정의. 이월 규칙은 여기서만 관리한다.
  # - 그날 스케줄된 활성 할 일 중 이월로 떠나지 않은 것
  # - 다른 날에서 이월되어 들어온 할 일(스케줄이 아니어도 그날의 목표가 된다)
  # 대시보드·완료 판정·일일 보너스·리캡이 모두 이 규칙을 쓴다.
  class Goals
    def self.tasks(user:, date:, away_ids: nil, incoming_ids: nil)
      away = away_ids.nil? ? TaskDeferral.away_ids(date) : away_ids
      incoming = incoming_ids.nil? ? TaskDeferral.incoming_ids(date) : incoming_ids

      user.task_templates.active_in_order.select do |task|
        (task.scheduled_for?(date) && !away.include?(task.id)) || incoming.include?(task.id)
      end
    end

    # 목표가 하나도 없으면 보너스를 주지 않는다(무소속 날 방지).
    def self.all_completed?(user:, date:)
      tasks = tasks(user: user, date: date)
      return false if tasks.empty?

      tasks.all? do |task|
        task.daily_task_completions.active.where(completed_on: date).count >= task.target_count
      end
    end
  end
end
