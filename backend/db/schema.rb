# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_23_000002) do
  create_table "daily_summaries", primary_key: "date", id: :date, force: :cascade do |t|
    t.datetime "all_goals_completed_at"
    t.datetime "created_at", null: false
    t.boolean "daily_bonus_awarded", default: false, null: false
    t.datetime "first_activity_at"
    t.integer "points_total", default: 0, null: false
    t.datetime "updated_at", null: false
  end

  create_table "daily_task_completions", id: :string, force: :cascade do |t|
    t.datetime "completed_at", null: false
    t.date "completed_on", null: false
    t.datetime "created_at", null: false
    t.datetime "reverted_at"
    t.integer "sequence", null: false
    t.string "source_device_id", null: false
    t.string "task_template_id", null: false
    t.datetime "updated_at", null: false
    t.index ["source_device_id"], name: "index_daily_task_completions_on_source_device_id"
    t.index ["task_template_id", "completed_on", "sequence"], name: "index_task_completions_on_daily_sequence", unique: true
    t.index ["task_template_id"], name: "index_daily_task_completions_on_task_template_id"
  end

  create_table "devices", id: :string, force: :cascade do |t|
    t.string "access_token_digest", null: false
    t.datetime "created_at", null: false
    t.string "expo_push_token"
    t.string "installation_id", null: false
    t.datetime "last_seen_at"
    t.string "name", null: false
    t.string "platform", null: false
    t.datetime "revoked_at"
    t.datetime "updated_at", null: false
    t.string "user_id", null: false
    t.text "web_push_subscription"
    t.index ["access_token_digest"], name: "index_devices_on_access_token_digest", unique: true
    t.index ["installation_id"], name: "index_devices_on_installation_id", unique: true
    t.index ["revoked_at"], name: "index_devices_on_revoked_at"
    t.index ["user_id"], name: "index_devices_on_user_id"
  end

  create_table "focus_sessions", id: :string, force: :cascade do |t|
    t.integer "active_lock"
    t.integer "completed_seconds"
    t.datetime "created_at", null: false
    t.datetime "ended_at"
    t.string "kind", default: "focus", null: false
    t.datetime "paused_at"
    t.integer "paused_seconds", default: 0, null: false
    t.integer "planned_seconds", null: false
    t.string "source_device_id", null: false
    t.string "start_idempotency_key", null: false
    t.datetime "started_at", null: false
    t.string "status", default: "running", null: false
    t.datetime "updated_at", null: false
    t.string "user_id", null: false
    t.index ["source_device_id"], name: "index_focus_sessions_on_source_device_id"
    t.index ["start_idempotency_key"], name: "index_focus_sessions_on_start_idempotency_key", unique: true
    t.index ["user_id", "active_lock"], name: "index_focus_sessions_on_active_lock", unique: true, where: "active_lock = 1"
    t.index ["user_id"], name: "index_focus_sessions_on_user_id"
    t.check_constraint "completed_seconds IS NULL OR completed_seconds >= 0", name: "focus_sessions_completed_seconds_non_negative"
    t.check_constraint "kind IN ('focus', 'break')", name: "focus_sessions_valid_kind"
    t.check_constraint "paused_seconds >= 0", name: "focus_sessions_paused_seconds_non_negative"
    t.check_constraint "planned_seconds BETWEEN 10 AND 7200", name: "focus_sessions_planned_seconds_range"
    t.check_constraint "status IN ('running', 'paused', 'completed', 'cancelled')", name: "focus_sessions_valid_status"
  end

  create_table "notification_deliveries", id: :string, force: :cascade do |t|
    t.datetime "attempted_at"
    t.text "body", null: false
    t.string "channel", null: false
    t.datetime "created_at", null: false
    t.string "device_id", null: false
    t.text "error_message"
    t.datetime "failed_at"
    t.string "notification_type", null: false
    t.string "schedule_key", null: false
    t.datetime "sent_at"
    t.string "status", default: "pending", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["device_id", "notification_type", "schedule_key"], name: "index_notification_deliveries_deduplication", unique: true
    t.index ["device_id"], name: "index_notification_deliveries_on_device_id"
    t.check_constraint "channel IN ('expo', 'web_push')", name: "notification_deliveries_valid_channel"
    t.check_constraint "status IN ('pending', 'sent', 'failed')", name: "notification_deliveries_valid_status"
  end

  create_table "point_events", id: :string, force: :cascade do |t|
    t.date "activity_date", null: false
    t.datetime "created_at", null: false
    t.string "daily_task_completion_id"
    t.string "event_type", null: false
    t.string "focus_session_id"
    t.string "idempotency_key", null: false
    t.datetime "occurred_at", null: false
    t.integer "points", null: false
    t.datetime "reversed_at"
    t.string "source_device_id"
    t.datetime "updated_at", null: false
    t.string "user_id", null: false
    t.index ["daily_task_completion_id"], name: "index_point_events_on_daily_task_completion_id"
    t.index ["focus_session_id"], name: "index_point_events_on_focus_session", unique: true, where: "focus_session_id IS NOT NULL"
    t.index ["idempotency_key"], name: "index_point_events_on_idempotency_key", unique: true
    t.index ["source_device_id"], name: "index_point_events_on_source_device_id"
    t.index ["user_id"], name: "index_point_events_on_user_id"
    t.check_constraint "NOT (daily_task_completion_id IS NOT NULL AND focus_session_id IS NOT NULL)", name: "point_events_one_activity_source"
  end

  create_table "reward_achievements", id: :string, force: :cascade do |t|
    t.datetime "achieved_at", null: false
    t.datetime "created_at", null: false
    t.datetime "notified_at"
    t.string "period_key", null: false
    t.string "reward_rule_id", null: false
    t.datetime "updated_at", null: false
    t.index ["reward_rule_id", "period_key"], name: "index_reward_achievements_on_rule_and_period", unique: true
    t.index ["reward_rule_id"], name: "index_reward_achievements_on_reward_rule_id"
  end

  create_table "reward_redemptions", id: :string, force: :cascade do |t|
    t.integer "cost_points"
    t.datetime "created_at", null: false
    t.string "idempotency_key"
    t.text "payload", default: "{}", null: false
    t.string "period_key"
    t.string "point_event_id"
    t.datetime "redeemed_at"
    t.string "reward_kind", null: false
    t.string "status", default: "redeemed", null: false
    t.datetime "unlocked_at"
    t.datetime "updated_at", null: false
    t.string "user_id", null: false
    t.index ["point_event_id"], name: "index_reward_redemptions_on_point_event_id"
    t.index ["user_id", "idempotency_key"], name: "index_reward_redemptions_on_user_idempotency_key", unique: true, where: "idempotency_key IS NOT NULL"
    t.index ["user_id", "reward_kind", "period_key"], name: "index_reward_redemptions_on_user_kind_period", unique: true
    t.index ["user_id"], name: "index_reward_redemptions_on_user_id"
    t.check_constraint "cost_points > 0", name: "reward_redemptions_cost_positive"
    t.check_constraint "reward_kind IN ('cheer', 'recovery', 'reflection', 'future', 'growth')", name: "reward_redemptions_valid_kind"
    t.check_constraint "status IN ('unlocked', 'redeemed', 'skipped')", name: "reward_redemptions_valid_status"
  end

  create_table "reward_rules", id: :string, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "period", null: false
    t.integer "required_points", null: false
    t.string "reward_text", null: false
    t.datetime "updated_at", null: false
    t.string "user_id", null: false
    t.index ["user_id", "period"], name: "index_reward_rules_on_user_id_and_period", unique: true
    t.index ["user_id"], name: "index_reward_rules_on_user_id"
    t.check_constraint "period IN ('daily', 'weekly')", name: "reward_rules_valid_period"
    t.check_constraint "required_points > 0", name: "reward_rules_required_points_positive"
  end

  create_table "settings", force: :cascade do |t|
    t.integer "break_minutes", default: 5, null: false
    t.datetime "created_at", null: false
    t.integer "daily_bonus_points", default: 30, null: false
    t.integer "daily_reward_points", default: 100, null: false
    t.string "daily_reward_text", default: "오늘 목표를 달성했어요!", null: false
    t.integer "focus_completion_points", default: 10, null: false
    t.integer "focus_minutes", default: 25, null: false
    t.string "nudge_at", default: "13:00", null: false
    t.boolean "nudge_enabled", default: true, null: false
    t.integer "sync_revision", default: 0, null: false
    t.string "timezone", default: "Asia/Seoul", null: false
    t.datetime "updated_at", null: false
    t.integer "weekly_reward_points", default: 300, null: false
    t.string "weekly_reward_text", default: "이번 주 목표를 달성했어요!", null: false
    t.check_constraint "break_minutes BETWEEN 1 AND 120", name: "settings_break_minutes_range"
    t.check_constraint "daily_bonus_points >= 0", name: "settings_daily_bonus_points_non_negative"
    t.check_constraint "daily_reward_points > 0", name: "settings_daily_reward_points_positive"
    t.check_constraint "focus_completion_points >= 0", name: "settings_focus_completion_points_non_negative"
    t.check_constraint "focus_minutes BETWEEN 1 AND 120", name: "settings_focus_minutes_range"
    t.check_constraint "id = 1", name: "settings_singleton_id"
    t.check_constraint "sync_revision >= 0", name: "settings_sync_revision_non_negative"
    t.check_constraint "weekly_reward_points > 0", name: "settings_weekly_reward_points_positive"
  end

  create_table "task_deferrals", id: :string, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "from_date", null: false
    t.string "reward_redemption_id"
    t.string "task_template_id", null: false
    t.date "to_date", null: false
    t.datetime "updated_at", null: false
    t.string "user_id", null: false
    t.index ["task_template_id", "from_date"], name: "index_task_deferrals_on_task_and_from_date", unique: true
    t.index ["user_id", "from_date"], name: "index_task_deferrals_on_user_id_and_from_date"
    t.index ["user_id", "to_date"], name: "index_task_deferrals_on_user_id_and_to_date"
    t.check_constraint "to_date > from_date", name: "task_deferrals_dates_ordered"
  end

  create_table "task_templates", id: :string, force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "kind", default: "custom", null: false
    t.integer "points", null: false
    t.integer "position", default: 0, null: false
    t.integer "target_count", default: 1, null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.string "user_id", null: false
    t.text "weekdays", default: "[]", null: false
    t.index ["user_id"], name: "index_task_templates_on_user_id"
    t.check_constraint "points >= 0", name: "task_template_points_non_negative"
    t.check_constraint "target_count > 0", name: "task_template_target_count_positive"
  end

  create_table "users", id: :string, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "weekly_retros", id: :string, force: :cascade do |t|
    t.text "body", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "user_id", null: false
    t.date "week_start", null: false
    t.index ["user_id", "week_start"], name: "index_weekly_retros_on_user_id_and_week_start", unique: true
    t.index ["user_id"], name: "index_weekly_retros_on_user_id"
    t.check_constraint "length(body) <= 500", name: "weekly_retros_body_length"
  end

  add_foreign_key "daily_task_completions", "devices", column: "source_device_id"
  add_foreign_key "daily_task_completions", "task_templates"
  add_foreign_key "devices", "users"
  add_foreign_key "focus_sessions", "devices", column: "source_device_id"
  add_foreign_key "focus_sessions", "users"
  add_foreign_key "notification_deliveries", "devices"
  add_foreign_key "point_events", "daily_task_completions"
  add_foreign_key "point_events", "devices", column: "source_device_id"
  add_foreign_key "point_events", "focus_sessions"
  add_foreign_key "point_events", "users"
  add_foreign_key "reward_achievements", "reward_rules"
  add_foreign_key "reward_redemptions", "point_events"
  add_foreign_key "reward_redemptions", "users"
  add_foreign_key "reward_rules", "users"
  add_foreign_key "task_deferrals", "reward_redemptions"
  add_foreign_key "task_deferrals", "task_templates"
  add_foreign_key "task_deferrals", "users"
  add_foreign_key "task_templates", "users"
  add_foreign_key "weekly_retros", "users"
end
