class CreateApplicationTables < ActiveRecord::Migration[8.1]
  def change
    create_table :applications, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.references :user, type: :string, null: false, foreign_key: true
      t.string :company, null: false
      t.string :title
      t.string :url
      t.text :memo
      t.string :status, null: false, default: "active"
      t.datetime :closed_at
      t.timestamps
    end
    add_check_constraint :applications, "status IN ('active', 'rejected', 'withdrawn', 'accepted')", name: "applications_valid_status"

    create_table :application_stages, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.references :user, type: :string, null: false, foreign_key: true
      t.string :name, null: false
      t.string :kind, null: false
      t.integer :position, null: false, default: 0
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_check_constraint :application_stages, "kind IN ('submission', 'interview', 'pass')", name: "application_stages_valid_kind"
    add_check_constraint :application_stages, "position >= 0", name: "application_stages_position_non_negative"

    create_table :application_stage_events, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.references :application, type: :string, null: false, foreign_key: true
      t.references :application_stage, type: :string, null: false, foreign_key: true
      # 단계 유형은 완료 순간의 스냅샷. 단계 이름을 바꿔도 이력의 점수 근거가 흔들리지 않는다.
      t.string :stage_kind, null: false
      t.references :source_device, type: :string, null: false, foreign_key: { to_table: :devices }
      t.date :completed_on, null: false
      t.datetime :completed_at, null: false
      t.datetime :reverted_at
      t.string :idempotency_key, null: false
      t.timestamps
    end
    add_index :application_stage_events, :idempotency_key, unique: true
    add_index :application_stage_events, %i[application_id application_stage_id],
      unique: true, where: "reverted_at IS NULL", name: "index_stage_events_unique_active_stage"
    # 제출·합격은 지원 건당 1회. 면접만 1차/2차처럼 반복 허용.
    add_index :application_stage_events, :application_id,
      unique: true, where: "stage_kind = 'submission' AND reverted_at IS NULL", name: "index_stage_events_unique_submission"
    add_index :application_stage_events, :application_id,
      unique: true, where: "stage_kind = 'pass' AND reverted_at IS NULL", name: "index_stage_events_unique_pass"
    add_check_constraint :application_stage_events, "stage_kind IN ('submission', 'interview', 'pass')",
      name: "application_stage_events_valid_stage_kind"

    # 제출 단계가 그날의 "실제 지원" 할 일 완료를 자동으로 채울 때 연결 고리를 남긴다.
    # 포인트는 단계 마일스톤에서만 지급되므로 이 완료에는 원장 이벤트가 없다.
    add_column :daily_task_completions, :application_stage_event_id, :string
    add_index :daily_task_completions, :application_stage_event_id
    add_foreign_key :daily_task_completions, :application_stage_events
  end
end
