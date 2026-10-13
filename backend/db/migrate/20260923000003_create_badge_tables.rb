class CreateBadgeTables < ActiveRecord::Migration[8.1]
  def change
    create_table :badge_rules, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.string :key, null: false
      t.string :category, null: false
      t.string :metric, null: false
      t.integer :threshold, null: false
      t.string :title, null: false
      t.string :description, null: false, default: ""
      t.string :icon, null: false, default: "🏅"
      t.integer :position, null: false, default: 0
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :badge_rules, :key, unique: true
    add_check_constraint :badge_rules, "threshold > 0", name: "badge_rules_threshold_positive"
    add_check_constraint :badge_rules, "category IN ('routine', 'steady', 'focus', 'apply', 'algorithm', 'portfolio')", name: "badge_rules_valid_category"
    add_check_constraint :badge_rules, "metric IN ('activity_days', 'focus_minutes', 'completed_tasks', 'created_tasks', 'application_completions', 'algorithm_completions', 'portfolio_completions')", name: "badge_rules_valid_metric"

    create_table :badge_achievements, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.references :badge_rule, null: false, type: :string, foreign_key: true
      t.references :user, null: false, type: :string, foreign_key: true
      t.datetime :achieved_at, null: false
      t.timestamps
    end
    add_index :badge_achievements, %i[user_id badge_rule_id], unique: true, name: "index_badge_achievements_on_user_and_rule"
  end
end
