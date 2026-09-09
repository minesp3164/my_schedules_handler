class AddSyncRevisionToSettings < ActiveRecord::Migration[8.1]
  def change
    add_column :settings, :sync_revision, :integer, null: false, default: 0
    add_check_constraint :settings, "sync_revision >= 0", name: "settings_sync_revision_non_negative"
  end
end
