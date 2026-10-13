# 회사 자동완성에서 골랐는지 여부.
# true = 실존 목록에서 선택, false = 자유 입력(미확인), null = 기능 이전 데이터.
class AddNoteVerifiedToDailyTaskCompletions < ActiveRecord::Migration[8.1]
  def change
    add_column :daily_task_completions, :note_verified, :boolean
  end
end
