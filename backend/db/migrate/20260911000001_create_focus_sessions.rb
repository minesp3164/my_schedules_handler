class CreateFocusSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :focus_sessions, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.references :source_device, null: false, type: :string, foreign_key: { to_table: :devices }
      t.datetime :started_at, null: false
      t.integer :planned_seconds, null: false
      t.string :status, null: false, default: "running"
      t.datetime :paused_at
      t.integer :paused_seconds, null: false, default: 0
      t.datetime :ended_at
      t.integer :completed_seconds
      t.integer :active_lock
      t.string :start_idempotency_key, null: false
      t.timestamps
    end
    add_index :focus_sessions, :start_idempotency_key, unique: true
    add_index :focus_sessions, :active_lock, unique: true, where: "active_lock = 1", name: "index_focus_sessions_on_active_lock"
    add_check_constraint :focus_sessions, "planned_seconds BETWEEN 60 AND 7200", name: "focus_sessions_planned_seconds_range"
    add_check_constraint :focus_sessions, "paused_seconds >= 0", name: "focus_sessions_paused_seconds_non_negative"
    add_check_constraint :focus_sessions, "completed_seconds IS NULL OR completed_seconds >= 0", name: "focus_sessions_completed_seconds_non_negative"
    add_check_constraint :focus_sessions, "status IN ('running', 'paused', 'completed', 'cancelled')", name: "focus_sessions_valid_status"

    add_column :point_events, :focus_session_id, :string
    add_foreign_key :point_events, :focus_sessions
    add_index :point_events, :focus_session_id, unique: true, where: "focus_session_id IS NOT NULL", name: "index_point_events_on_focus_session"
    add_check_constraint :point_events, "NOT (daily_task_completion_id IS NOT NULL AND focus_session_id IS NOT NULL)", name: "point_events_one_activity_source"
  end
end
