class AddKindToFocusSessions < ActiveRecord::Migration[8.1]
  def change
    add_column :focus_sessions, :kind, :string, null: false, default: "focus"
    add_check_constraint :focus_sessions, "kind IN ('focus', 'break')", name: "focus_sessions_valid_kind"
  end
end
