class AddApplicationStageEventsToPointEvents < ActiveRecord::Migration[8.1]
  # SQLite은 CHECK 변경이 불가라서 원장 테이블을 재생성한다.
  # 활동 출처(할 일 완료 / 집중 세션 / 지원 단계)는 어느 경우든 최대 하나만 값이 있어야 한다.
  def up
    execute("PRAGMA foreign_keys = OFF")

    # 인덱스·외래키는 rename 후에 같은 이름으로 다시 단다(index: false 필수).
    create_table :point_events_new, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.references :user, type: :string, null: false, foreign_key: false, index: false
      t.references :daily_task_completion, type: :string, foreign_key: false, index: false
      t.references :focus_session, type: :string, foreign_key: false, index: false
      t.references :application_stage_event, type: :string, foreign_key: false, index: false
      t.references :source_device, type: :string, foreign_key: false, index: false
      t.date :activity_date, null: false
      t.string :event_type, null: false
      t.integer :points, null: false
      t.string :idempotency_key, null: false
      t.datetime :occurred_at, null: false
      t.datetime :reversed_at
      t.timestamps
    end
    add_check_constraint :point_events_new,
      "NOT (daily_task_completion_id IS NOT NULL AND focus_session_id IS NOT NULL)",
      name: "point_events_one_activity_source"
    add_check_constraint :point_events_new,
      "NOT (daily_task_completion_id IS NOT NULL AND application_stage_event_id IS NOT NULL)",
      name: "point_events_one_completion_source"
    add_check_constraint :point_events_new,
      "NOT (focus_session_id IS NOT NULL AND application_stage_event_id IS NOT NULL)",
      name: "point_events_one_focus_source"

    execute <<~SQL
      INSERT INTO point_events_new (
        id, user_id, daily_task_completion_id, focus_session_id, application_stage_event_id,
        source_device_id, activity_date, event_type, points, idempotency_key,
        occurred_at, reversed_at, created_at, updated_at
      )
      SELECT
        id, user_id, daily_task_completion_id, focus_session_id, NULL,
        source_device_id, activity_date, event_type, points, idempotency_key,
        occurred_at, reversed_at, created_at, updated_at
      FROM point_events;
    SQL

    drop_table :point_events
    execute("ALTER TABLE point_events_new RENAME TO point_events")

    # drop_table로 함께 사라진 인덱스·외래키를 같은 이름으로 되돌린다.
    add_index :point_events, :daily_task_completion_id
    add_index :point_events, :focus_session_id, unique: true, where: "focus_session_id IS NOT NULL", name: "index_point_events_on_focus_session"
    add_index :point_events, :application_stage_event_id, unique: true, where: "application_stage_event_id IS NOT NULL", name: "index_point_events_on_application_stage_event"
    add_index :point_events, :source_device_id
    add_index :point_events, :user_id
    add_index :point_events, :idempotency_key, unique: true
    add_foreign_key :point_events, :daily_task_completions
    add_foreign_key :point_events, :focus_sessions
    add_foreign_key :point_events, :application_stage_events
    add_foreign_key :point_events, :devices, column: :source_device_id
    add_foreign_key :point_events, :users
  ensure
    execute("PRAGMA foreign_keys = ON")
  end

  def down
    execute("PRAGMA foreign_keys = OFF")

    create_table :point_events_old, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.references :user, type: :string, null: false, foreign_key: false, index: false
      t.references :daily_task_completion, type: :string, foreign_key: false, index: false
      t.references :focus_session, type: :string, foreign_key: false, index: false
      t.references :source_device, type: :string, foreign_key: false, index: false
      t.date :activity_date, null: false
      t.string :event_type, null: false
      t.integer :points, null: false
      t.string :idempotency_key, null: false
      t.datetime :occurred_at, null: false
      t.datetime :reversed_at
      t.timestamps
    end
    add_check_constraint :point_events_old,
      "NOT (daily_task_completion_id IS NOT NULL AND focus_session_id IS NOT NULL)",
      name: "point_events_one_activity_source"

    execute <<~SQL
      INSERT INTO point_events_old (
        id, user_id, daily_task_completion_id, focus_session_id,
        source_device_id, activity_date, event_type, points, idempotency_key,
        occurred_at, reversed_at, created_at, updated_at
      )
      SELECT
        id, user_id, daily_task_completion_id, focus_session_id,
        source_device_id, activity_date, event_type, points, idempotency_key,
        occurred_at, reversed_at, created_at, updated_at
      FROM point_events
      WHERE application_stage_event_id IS NULL;
    SQL

    drop_table :point_events
    execute("ALTER TABLE point_events_old RENAME TO point_events")

    add_index :point_events, :daily_task_completion_id
    add_index :point_events, :focus_session_id, unique: true, where: "focus_session_id IS NOT NULL", name: "index_point_events_on_focus_session"
    add_index :point_events, :source_device_id
    add_index :point_events, :user_id
    add_index :point_events, :idempotency_key, unique: true
    add_foreign_key :point_events, :daily_task_completions
    add_foreign_key :point_events, :focus_sessions
    add_foreign_key :point_events, :devices, column: :source_device_id
    add_foreign_key :point_events, :users
  ensure
    execute("PRAGMA foreign_keys = ON")
  end
end
