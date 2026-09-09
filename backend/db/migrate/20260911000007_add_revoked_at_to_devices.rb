class AddRevokedAtToDevices < ActiveRecord::Migration[8.1]
  def change
    add_column :devices, :revoked_at, :datetime
    add_index :devices, :revoked_at
  end
end
