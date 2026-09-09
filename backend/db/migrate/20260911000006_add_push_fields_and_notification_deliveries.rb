class AddPushFieldsAndNotificationDeliveries < ActiveRecord::Migration[8.1]
  def change
    add_column :devices, :expo_push_token, :string
    add_column :devices, :web_push_subscription, :text

    create_table :notification_deliveries, id: false do |t|
      t.string :id, primary_key: true, null: false
      t.references :device, null: false, type: :string, foreign_key: true
      t.string :notification_type, null: false
      t.string :schedule_key, null: false
      t.string :channel, null: false
      t.string :status, null: false, default: "pending"
      t.string :title, null: false
      t.text :body, null: false
      t.datetime :attempted_at
      t.datetime :sent_at
      t.datetime :failed_at
      t.text :error_message
      t.timestamps
    end
    add_index :notification_deliveries, %i[device_id notification_type schedule_key], unique: true, name: "index_notification_deliveries_deduplication"
    add_check_constraint :notification_deliveries, "channel IN ('expo', 'web_push')", name: "notification_deliveries_valid_channel"
    add_check_constraint :notification_deliveries, "status IN ('pending', 'sent', 'failed')", name: "notification_deliveries_valid_status"
  end
end
