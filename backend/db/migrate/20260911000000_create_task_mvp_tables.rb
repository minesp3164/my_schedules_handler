class CreateTaskMvpTables < ActiveRecord::Migration[8.1]
  def change
    create_table :devices, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.string :installation_id, null: false
      t.string :name, null: false
      t.string :platform, null: false
      t.string :access_token_digest, null: false
      t.datetime :last_seen_at
      t.timestamps
    end
    add_index :devices, :installation_id, unique: true
    add_index :devices, :access_token_digest, unique: true

    create_table :task_templates, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.string :title, null: false
      t.integer :points, null: false
      t.integer :target_count, null: false, default: 1
      t.integer :position, null: false, default: 0
      t.string :kind, null: false, default: "custom"
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_check_constraint :task_templates, "points >= 0", name: "task_template_points_non_negative"
    add_check_constraint :task_templates, "target_count > 0", name: "task_template_target_count_positive"

    create_table :daily_task_completions, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.references :task_template, null: false, type: :string, foreign_key: true
      t.references :source_device, null: false, type: :string, foreign_key: { to_table: :devices }
      t.date :completed_on, null: false
      t.integer :sequence, null: false
      t.datetime :completed_at, null: false
      t.datetime :reverted_at
      t.timestamps
    end
    add_index :daily_task_completions, %i[task_template_id completed_on sequence], unique: true, name: "index_task_completions_on_daily_sequence"

    create_table :point_events, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.references :daily_task_completion, type: :string, foreign_key: true
      t.references :source_device, type: :string, foreign_key: { to_table: :devices }
      t.date :activity_date, null: false
      t.string :event_type, null: false
      t.integer :points, null: false
      t.string :idempotency_key, null: false
      t.datetime :occurred_at, null: false
      t.datetime :reversed_at
      t.timestamps
    end
    add_index :point_events, :idempotency_key, unique: true

    create_table :daily_summaries, id: false do |t|
      t.date :date, null: false, primary_key: true
      t.integer :points_total, null: false, default: 0
      t.datetime :first_activity_at
      t.datetime :all_goals_completed_at
      t.boolean :daily_bonus_awarded, null: false, default: false
      t.timestamps
    end
  end
end
