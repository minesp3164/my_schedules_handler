# 회복 패스 사용 효과: 오늘의 할 일 하나를 내일로 이월한다.
# - from_date: 이월이 일어난 날(목표에서 빠지는 날)
# - to_date:   할 일이 다시 등장하는 날(from_date + 1)
# - reward_redemption: 사용한 회복 패스 기록(되돌리기 시 복구에 쓰인다)
class CreateTaskDeferrals < ActiveRecord::Migration[8.1]
  def change
    create_table :task_deferrals, id: :string do |t|
      t.string :user_id, null: false
      t.string :task_template_id, null: false
      t.date :from_date, null: false
      t.date :to_date, null: false
      t.string :reward_redemption_id
      t.timestamps
    end

    add_index :task_deferrals, [:task_template_id, :from_date],
      unique: true, name: "index_task_deferrals_on_task_and_from_date"
    add_index :task_deferrals, [:user_id, :from_date]
    add_index :task_deferrals, [:user_id, :to_date]
    add_check_constraint :task_deferrals, "to_date > from_date", name: "task_deferrals_dates_ordered"

    add_foreign_key :task_deferrals, :users
    add_foreign_key :task_deferrals, :task_templates
    add_foreign_key :task_deferrals, :reward_redemptions
  end
end
