class CreateWeeklyRetros < ActiveRecord::Migration[8.1]
  def change
    create_table :weekly_retros, id: :string do |t|
      t.references :user, null: false, foreign_key: true, type: :string
      t.date :week_start, null: false
      t.text :body, null: false
      t.timestamps
    end

    add_index :weekly_retros, %i[user_id week_start], unique: true
    add_check_constraint :weekly_retros, "length(body) <= 500", name: "weekly_retros_body_length"
  end
end
