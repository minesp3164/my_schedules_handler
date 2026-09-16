class RelaxFocusSessionPlannedSecondsRange < ActiveRecord::Migration[8.1]
  def up
    remove_check_constraint :focus_sessions, name: "focus_sessions_planned_seconds_range"
    add_check_constraint :focus_sessions, "planned_seconds BETWEEN 10 AND 7200", name: "focus_sessions_planned_seconds_range"
  end

  def down
    remove_check_constraint :focus_sessions, name: "focus_sessions_planned_seconds_range"
    add_check_constraint :focus_sessions, "planned_seconds BETWEEN 60 AND 7200", name: "focus_sessions_planned_seconds_range"
  end
end
