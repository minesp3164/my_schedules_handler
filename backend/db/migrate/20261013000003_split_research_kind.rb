# 기업 리서치(조사만 한 활동)와 이력서 지원(실제 지원)을 한 kind로 취급하지 않는다.
# 기존에 application으로 저장된 리서치 할 일만 제목 기준으로 research로 옮기고,
# 포인트도 리서치 규칙(10점 × 목표 횟수)에 맞춰 다시 계산한다. 이미 기록된 포인트 이벤트는 건드리지 않는다.
class SplitResearchKind < ActiveRecord::Migration[8.1]
  def up
    say_with_time "move research tasks out of application kind" do
      execute <<~SQL
        UPDATE task_templates
           SET kind = 'research',
               points = 10 * MAX(target_count, 1),
               updated_at = CURRENT_TIMESTAMP
         WHERE kind = 'application'
           AND title LIKE '%리서치%'
      SQL
    end
  end

  def down
    say_with_time "put research tasks back into application kind" do
      execute <<~SQL
        UPDATE task_templates
           SET kind = 'application',
               points = 25,
               updated_at = CURRENT_TIMESTAMP
         WHERE kind = 'research'
           AND title LIKE '%리서치%'
      SQL
    end
  end
end
