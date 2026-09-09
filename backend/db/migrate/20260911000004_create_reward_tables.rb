class CreateRewardTables < ActiveRecord::Migration[8.1]
  def change
    create_table :reward_rules, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.string :period, null: false
      t.integer :required_points, null: false
      t.string :reward_text, null: false
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :reward_rules, :period, unique: true
    add_check_constraint :reward_rules, "period IN ('daily', 'weekly')", name: "reward_rules_valid_period"
    add_check_constraint :reward_rules, "required_points > 0", name: "reward_rules_required_points_positive"

    create_table :reward_achievements, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.references :reward_rule, null: false, type: :string, foreign_key: true
      t.string :period_key, null: false
      t.datetime :achieved_at, null: false
      t.datetime :notified_at
      t.timestamps
    end
    add_index :reward_achievements, %i[reward_rule_id period_key], unique: true, name: "index_reward_achievements_on_rule_and_period"
  end
end
