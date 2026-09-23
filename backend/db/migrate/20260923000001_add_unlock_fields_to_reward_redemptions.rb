# 보상 체계를 차감형 -> 해금·사용 기록형으로 전환한다.
# - 기존 구매 이력은 status='redeemed'(=이미 사용한 보상)로 보존된다.
# - 해금형 보상은 point_event/cost_points 없이 기록된다.
# - period_key: 주간(cheer)·월간(growth) 보상의 1회 사용 제한에 쓴다.
class AddUnlockFieldsToRewardRedemptions < ActiveRecord::Migration[8.1]
  def up
    add_column :reward_redemptions, :status, :string, default: "redeemed", null: false
    add_column :reward_redemptions, :unlocked_at, :datetime
    add_column :reward_redemptions, :period_key, :string
    add_column :reward_redemptions, :idempotency_key, :string

    # 해금형 보상은 포인트를 쓰지 않으므로 point_event가 없을 수 있다.
    change_column_null :reward_redemptions, :point_event_id, true
    change_column_null :reward_redemptions, :redeemed_at, true
    change_column_null :reward_redemptions, :cost_points, true

    # cost_points > 0 체크는 NULL을 통과한다(SQLite CHECK는 NULL을 통과시킨다).
    add_check_constraint :reward_redemptions, "status IN ('unlocked', 'redeemed', 'skipped')",
      name: "reward_redemptions_valid_status"

    # 주간/월간 보상의 중복 사용 방지(NULL period_key는 복수 허용)
    add_index :reward_redemptions, [:user_id, :reward_kind, :period_key],
      unique: true, name: "index_reward_redemptions_on_user_kind_period"
    add_index :reward_redemptions, [:user_id, :idempotency_key],
      unique: true, name: "index_reward_redemptions_on_user_idempotency_key",
      where: "idempotency_key IS NOT NULL"

    # 기존 구매 이력: 해금 시점 = 구매 시점
    execute <<~SQL
      UPDATE reward_redemptions SET unlocked_at = redeemed_at WHERE unlocked_at IS NULL
    SQL
  end

  def down
    remove_index :reward_redemptions, name: "index_reward_redemptions_on_user_idempotency_key"
    remove_index :reward_redemptions, name: "index_reward_redemptions_on_user_kind_period"
    remove_check_constraint :reward_redemptions, name: "reward_redemptions_valid_status"
    remove_column :reward_redemptions, :idempotency_key
    remove_column :reward_redemptions, :period_key
    remove_column :reward_redemptions, :unlocked_at
    remove_column :reward_redemptions, :status
    change_column_null :reward_redemptions, :cost_points, false
    change_column_null :reward_redemptions, :redeemed_at, false
    change_column_null :reward_redemptions, :point_event_id, false
  end
end
