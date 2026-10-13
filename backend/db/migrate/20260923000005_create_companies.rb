# 회사 자동완성용 실존 목록 캐시. DART(전자공시) 동기화 또는 시드 목록으로 채운다.
class CreateCompanies < ActiveRecord::Migration[8.1]
  def change
    create_table :companies, id: :string do |t|
      t.string :name, null: false
      t.string :normalized_name, null: false
      t.string :corp_code
      t.string :stock_code
      t.string :source, null: false, default: "seed"
      t.timestamps
    end

    add_index :companies, :normalized_name, unique: true
    add_index :companies, :name
  end
end
