require "test_helper"
require "digest"

class Rewards::ClaimTest < ActiveSupport::TestCase
  setup do
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Claim device",
      platform: "ios",
      access_token_digest: Digest::SHA256.hexdigest("claim-token")
    )
    @date = Date.new(2026, 9, 9)
  end

  test "cheer claim records usage once per week without spending points" do
    add_points(Date.new(2026, 9, 8), 100, "week-100")

    assert_no_difference "PointEvent.count" do
      result = Rewards::Claim.call(user: @user, reward_kind: "cheer", idempotency_key: "cheer-1",
        payload: { "message" => "작게 시작해도 괜찮아요" }, date: @date)

      assert_equal "redeemed", result.record.status
      assert_equal week_key, result.record.period_key
      assert_nil result.record.point_event
      assert_nil result.record.cost_points
      assert_equal 100, result.balance, "차감이 없으므로 잔액은 그대로다"
      assert_not result.replayed
    end

    assert_raises(Rewards::Claim::LimitReached) do
      Rewards::Claim.call(user: @user, reward_kind: "cheer", idempotency_key: "cheer-2",
        payload: { "message" => "두 번째 응원" }, date: @date)
    end

    replay = Rewards::Claim.call(user: @user, reward_kind: "cheer", idempotency_key: "cheer-1",
      payload: { "message" => "작게 시작해도 괜찮아요" }, date: @date)
    assert replay.replayed
    assert_equal 1, @user.reward_redemptions.where(reward_kind: "cheer").count
  end

  test "cheer claim is locked below the weekly threshold" do
    add_points(Date.new(2026, 9, 8), 99, "week-99")

    assert_raises(Rewards::Claim::Locked) do
      Rewards::Claim.call(user: @user, reward_kind: "cheer", idempotency_key: "cheer-1",
        payload: { "message" => "응원" }, date: @date)
    end
  end

  test "cheer message must be present and short" do
    add_points(Date.new(2026, 9, 8), 100, "week-100")

    assert_raises(ActiveRecord::RecordInvalid) do
      Rewards::Claim.call(user: @user, reward_kind: "cheer", idempotency_key: "cheer-1",
        payload: { "message" => "" }, date: @date)
    end
    assert_raises(ActiveRecord::RecordInvalid) do
      Rewards::Claim.call(user: @user, reward_kind: "cheer", idempotency_key: "cheer-2",
        payload: { "message" => "x" * 101 }, date: @date)
    end
  end

  test "recovery claim holds one pass and never more" do
    add_points(Date.new(2026, 9, 1), 400, "earned-400")

    result = Rewards::Claim.call(user: @user, reward_kind: "recovery", idempotency_key: "rec-1", date: @date)
    assert_equal "unlocked", result.record.status
    assert_nil result.record.redeemed_at
    assert_nil result.record.cost_points

    assert_raises(Rewards::Claim::LimitReached) do
      Rewards::Claim.call(user: @user, reward_kind: "recovery", idempotency_key: "rec-2", date: @date)
    end

    # 나중에 하기(회복 패스는 여전히 보유 중)도 새 보상을 막는다.
    Rewards::SetStatus.call(user: @user, id: result.record.id, status: "skipped")
    assert_raises(Rewards::Claim::LimitReached) do
      Rewards::Claim.call(user: @user, reward_kind: "recovery", idempotency_key: "rec-3", date: @date)
    end

    # 보유분을 사용(2단계 효과를 반영한 상태)하면 다음 누적 구간에서 새 보상을 받을 수 있다.
    result.record.update!(status: "redeemed", redeemed_at: Time.current)
    next_pass = Rewards::Claim.call(user: @user, reward_kind: "recovery", idempotency_key: "rec-4", date: @date)
    assert_equal "unlocked", next_pass.record.status
    assert_equal 2, @user.reward_redemptions.where(reward_kind: "recovery").count
  end

  test "recovery claim is locked below the cumulative threshold" do
    add_points(Date.new(2026, 9, 1), 199, "earned-199")

    assert_raises(Rewards::Claim::Locked) do
      Rewards::Claim.call(user: @user, reward_kind: "recovery", idempotency_key: "rec-1", date: @date)
    end
  end

  test "future letters need the cumulative unlock and can be written repeatedly" do
    assert_raises(Rewards::Claim::Locked) do
      Rewards::Claim.call(user: @user, reward_kind: "future", idempotency_key: "fut-1",
        payload: { "letter" => "미래의 나에게" }, date: @date)
    end

    add_points(Date.new(2026, 9, 1), 400, "earned-400")

    first = Rewards::Claim.call(user: @user, reward_kind: "future", idempotency_key: "fut-2",
      payload: { "letter" => "미래의 나에게" }, date: @date)
    second = Rewards::Claim.call(user: @user, reward_kind: "future", idempotency_key: "fut-3",
      payload: { "letter" => "6개월 뒤의 나에게" }, date: @date)

    assert_equal "redeemed", first.record.status
    assert_equal "미래의 나에게", first.record.payload["letter"]
    assert_equal 2, @user.reward_redemptions.where(reward_kind: "future").count, "해금 후 상시 작성"
    assert_nil second.record.period_key
  end

  test "growth card saves once per month with server computed stats" do
    add_points(Date.new(2026, 9, 1), 500, "earned-500")

    result = Rewards::Claim.call(user: @user, reward_kind: "growth", idempotency_key: "grow-1", date: @date)
    stats = result.record.payload.fetch("stats")

    assert_equal "2026-09", result.record.period_key
    assert_equal "2026-09", stats.fetch("month")
    assert_equal 0, stats.fetch("focus_minutes")

    assert_raises(Rewards::Claim::LimitReached) do
      Rewards::Claim.call(user: @user, reward_kind: "growth", idempotency_key: "grow-2", date: @date)
    end

    next_month = Rewards::Claim.call(user: @user, reward_kind: "growth", idempotency_key: "grow-3",
      date: Date.new(2026, 10, 5))
    assert_equal "2026-10", next_month.record.period_key, "다음 달에는 새 카드를 만들 수 있다"
  end

  test "reflection keeps the purchase flow" do
    add_points(Date.new(2026, 9, 1), 400, "earned-400")

    assert_difference "PointEvent.count", 1 do
      result = Rewards::Claim.call(user: @user, reward_kind: "reflection", idempotency_key: "retro-1",
        source_device: @device, date: @date)
      assert_equal 300, result.record.cost_points
      assert_equal "redeemed", result.record.status
      assert_equal 100, result.balance, "주간 회고만 점수로 산다"
    end

    assert_raises(Rewards::Redeem::UnknownReward) do
      Rewards::Claim.call(user: @user, reward_kind: "unknown", idempotency_key: "x-1", date: @date)
    end
  end

  private

  def week_key
    format("%<year>d-W%<week>02d", year: @date.cwyear, week: @date.cweek)
  end

  def add_points(date, points, key)
    PointEvent.create!(
      user: @user,
      source_device: @device,
      activity_date: date,
      event_type: "adjustment",
      points: points,
      idempotency_key: key,
      occurred_at: Time.zone.parse("#{date} 10:00:00")
    )
  end
end
