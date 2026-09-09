class CreateSettings < ActiveRecord::Migration[8.1]
  def change
    create_table :settings, id: false do |t|
      t.integer :id, primary_key: true, null: false
      t.integer :focus_minutes, null: false, default: 25
      t.integer :break_minutes, null: false, default: 5
      t.boolean :nudge_enabled, null: false, default: true
      t.string :nudge_at, null: false, default: "13:00"
      t.string :timezone, null: false, default: "Asia/Seoul"
      t.integer :daily_reward_points, null: false, default: 100
      t.integer :weekly_reward_points, null: false, default: 300
      t.string :daily_reward_text, null: false, default: "오늘 목표를 달성했어요!"
      t.string :weekly_reward_text, null: false, default: "이번 주 목표를 달성했어요!"
      t.timestamps
    end

    add_check_constraint :settings, "id = 1", name: "settings_singleton_id"
    add_check_constraint :settings, "focus_minutes BETWEEN 1 AND 120", name: "settings_focus_minutes_range"
    add_check_constraint :settings, "break_minutes BETWEEN 1 AND 120", name: "settings_break_minutes_range"
    add_check_constraint :settings, "daily_reward_points > 0", name: "settings_daily_reward_points_positive"
    add_check_constraint :settings, "weekly_reward_points > 0", name: "settings_weekly_reward_points_positive"
  end
end
