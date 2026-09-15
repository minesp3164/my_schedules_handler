class CreateRewardRedemptions < ActiveRecord::Migration[8.1]
  def change
    create_table :reward_redemptions, id: :string do |t|
      t.references :user, null: false, type: :string, foreign_key: true
      t.references :point_event, null: false, type: :string, foreign_key: true
      t.string :reward_kind, null: false
      t.integer :cost_points, null: false
      t.datetime :redeemed_at, null: false
      t.timestamps
    end
    add_check_constraint :reward_redemptions, "reward_kind IN ('cheer', 'recovery', 'reflection', 'future', 'growth')", name: 'reward_redemptions_valid_kind'
    add_check_constraint :reward_redemptions, 'cost_points > 0', name: 'reward_redemptions_cost_positive'
  end
end
