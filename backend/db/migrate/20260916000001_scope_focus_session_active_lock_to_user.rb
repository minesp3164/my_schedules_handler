class ScopeFocusSessionActiveLockToUser < ActiveRecord::Migration[8.1]
  def change
    remove_index :focus_sessions, name: "index_focus_sessions_on_active_lock"
    add_index :focus_sessions, %i[user_id active_lock],
      unique: true,
      where: "active_lock = 1",
      name: "index_focus_sessions_on_active_lock"
  end
end
