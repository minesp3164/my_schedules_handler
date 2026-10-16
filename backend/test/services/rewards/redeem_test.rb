require "test_helper"
require "digest"

class Rewards::RedeemTest < ActiveSupport::TestCase
  setup do
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Redeem device",
      platform: "ios",
      access_token_digest: Digest::SHA256.hexdigest("redeem-token")
    )
    @date = Date.new(2026, 9, 9)
    @now = Time.zone.parse("2026-09-09 21:00:00")
  end

  test "spending points recalculates today's daily summary" do
    add_points(400, "redeem-earned-400")
    Points::RecalculateDailySummary.call(date: @date)
    assert_equal 400, DailySummary.find_by(date: @date).points_total

    result = Rewards::Redeem.call(
      user: @user, source_device: @device, reward_kind: "reflection",
      idempotency_key: "redeem-1", now: @now
    )

    assert_equal 300, result.redemption.cost_points
    assert_equal 100, result.remaining_points
    # 사용 직후 오늘 합계에서 차감이 반영된다(대시보드 점수와 원장이 어긋나지 않는다).
    assert_equal 100, DailySummary.find_by(date: @date).points_total
    assert_equal 100, PointEvent.effective.where(activity_date: @date).sum(:points)
  end

  test "replaying the same key does not deduct or recalculate twice" do
    add_points(400, "redeem-earned-400")

    first = Rewards::Redeem.call(
      user: @user, source_device: @device, reward_kind: "reflection",
      idempotency_key: "redeem-replay", now: @now
    )
    replay = Rewards::Redeem.call(
      user: @user, source_device: @device, reward_kind: "reflection",
      idempotency_key: "redeem-replay", now: @now + 60
    )

    assert_not first.replayed
    assert replay.replayed
    assert_equal 1, PointEvent.where(event_type: "reward_redemption").count
    assert_equal 100, DailySummary.find_by(date: @date).points_total
  end

  test "rejects when the balance is below the cost" do
    add_points(299, "redeem-earned-299")
    Points::RecalculateDailySummary.call(date: @date)

    assert_raises(Rewards::Redeem::InsufficientPoints) do
      Rewards::Redeem.call(
        user: @user, source_device: @device, reward_kind: "reflection",
        idempotency_key: "redeem-poor", now: @now
      )
    end

    assert_equal 299, DailySummary.find_by(date: @date).points_total, "거절된 차감은 요약에 남지 않는다"
  end

  private

  def add_points(points, key)
    PointEvent.create!(
      user: @user, source_device: @device, activity_date: @date, event_type: "task_completion",
      points: points, idempotency_key: key, occurred_at: @now - 3600
    )
  end
end
