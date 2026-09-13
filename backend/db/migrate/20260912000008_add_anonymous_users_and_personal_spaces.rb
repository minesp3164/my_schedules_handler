class AddAnonymousUsersAndPersonalSpaces < ActiveRecord::Migration[8.1]
  def up
    create_table :users, id: :string do |t|
      t.timestamps
    end

    legacy_user_id = SecureRandom.uuid
    execute <<~SQL
      INSERT INTO users (id, created_at, updated_at)
      VALUES ('#{legacy_user_id}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    SQL

    add_reference :devices, :user, type: :string, foreign_key: true
    execute "UPDATE devices SET user_id = '#{legacy_user_id}'"
    change_column_null :devices, :user_id, false

    add_reference :task_templates, :user, type: :string, foreign_key: true
    add_reference :point_events, :user, type: :string, foreign_key: true
    add_reference :focus_sessions, :user, type: :string, foreign_key: true
    add_reference :reward_rules, :user, type: :string, foreign_key: true
    execute "UPDATE task_templates SET user_id = '#{legacy_user_id}'"
    execute "UPDATE point_events SET user_id = '#{legacy_user_id}'"
    execute "UPDATE focus_sessions SET user_id = '#{legacy_user_id}'"
    execute "UPDATE reward_rules SET user_id = '#{legacy_user_id}'"
    change_column_null :task_templates, :user_id, false
    change_column_null :point_events, :user_id, false
    change_column_null :focus_sessions, :user_id, false
    change_column_null :reward_rules, :user_id, false

    remove_index :reward_rules, :period
    add_index :reward_rules, %i[user_id period], unique: true
  end

  def down
    remove_index :reward_rules, %i[user_id period]
    add_index :reward_rules, :period, unique: true
    %i[task_templates point_events focus_sessions reward_rules devices].each do |table|
      remove_reference table, :user, type: :string, foreign_key: true
    end
    drop_table :users
  end
end
