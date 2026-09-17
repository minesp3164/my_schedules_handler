class AddPayloadToRewardRedemptions < ActiveRecord::Migration[8.1]
  def change
    add_column :reward_redemptions, :payload, :text, null: false, default: "{}"
  end
end
