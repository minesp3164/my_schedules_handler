# 실제 지원 같은 할 일 완료 시 회사명 같은 메모(note)를 남긴다.
# note는 비어 있을 수 있으며, '실제 지원'(kind: application) 완료 시에는 services/tasks/complete.rb가 필수로 요구한다.
class AddNoteToDailyTaskCompletions < ActiveRecord::Migration[8.1]
  def change
    add_column :daily_task_completions, :note, :string
  end
end
