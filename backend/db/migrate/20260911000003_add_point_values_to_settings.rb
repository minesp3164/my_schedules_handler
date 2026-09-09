class AddPointValuesToSettings < ActiveRecord::Migration[8.1]
  def change
    add_column :settings, :focus_completion_points, :integer, null: false, default: 10
    add_column :settings, :daily_bonus_points, :integer, null: false, default: 30

    add_check_constraint :settings, "focus_completion_points >= 0", name: "settings_focus_completion_points_non_negative"
    add_check_constraint :settings, "daily_bonus_points >= 0", name: "settings_daily_bonus_points_non_negative"
  end
end
