class AddWeekdaysToTaskTemplates < ActiveRecord::Migration[8.1]
  def change
    add_column :task_templates, :weekdays, :text, null: false, default: "[]"
  end
end
