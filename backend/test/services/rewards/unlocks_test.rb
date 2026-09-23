require "test_helper"
require "digest"

class Rewards::UnlocksTest < ActiveSupport::TestCase
  setup do
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Unlock device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest("unlock-token")
    )
    @date = Date.new(2026, 9, 9) # 수요일. 주간은 2026-09-07 ~ 09-13.
  end

  test "everything starts locked with zero points" do
    result = Rewards::Unlocks.call(user: @user, date: @date)

    assert_equal 5, result.unlocks.size
    assert_equal 0, result.total_points
    assert_equal 0, result.earned_points
    result.unlocks.each do |state|
      assert_not state.fetch(:unlocked)
      assert_not state.fetch(:available)
      assert_equal "locked", state.fetch(:reason)
    end
  end

  test "each kind unlocks on its own basis and unit" do
    add_points(Date.new(2026, 9, 8), 100, "week-100")
    add_points(Date.new(2026, 9, 1), 350, "past-350")

    result = Rewards::Unlocks.call(user: @user, date: @date)
    state = ->(kind) { result.unlocks.find { |item| item.fetch(:kind) == kind } }

    cheer = state.call("cheer")
    assert cheer.fetch(:unlocked)
    assert cheer.fetch(:available)
    assert_equal "weekly", cheer.fetch(:unit)
    assert_equal 100, cheer.fetch(:progress)
    assert_equal week_key, cheer.fetch(:period_key)

    recovery = state.call("recovery")
    assert recovery.fetch(:unlocked)
    assert recovery.fetch(:available)
    assert_equal "total", recovery.fetch(:unit)
    assert_nil recovery.fetch(:record), "보유 기록은 보상 받기(POST)로만 만들어진다"

    assert state.call("reflection").fetch(:unlocked), "보유 잔액 450 >= 300"
    assert state.call("future").fetch(:unlocked), "누적 450 >= 400"

    growth = state.call("growth")
    assert_not growth.fetch(:unlocked), "누적 450 < 500"
    assert_not growth.key?(:stats), "해금 전에는 통계를 만들지 않는다"

    assert_equal 450, result.earned_points
    assert_equal 450, result.total_points, "해금형 보상은 포인트를 쓰지 않는다"
  end

  test "reflection uses the balance so purchases can lock it again" do
    add_points(Date.new(2026, 9, 1), 450, "earned-450")
    add_points(Date.new(2026, 9, 9), -200, "spent-200")

    result = Rewards::Unlocks.call(user: @user, date: @date)
    state = ->(kind) { result.unlocks.find { |item| item.fetch(:kind) == kind } }

    assert_equal 450, result.earned_points, "누적 적립은 차감되지 않는다"
    assert_equal 250, result.total_points
    assert_not state.call("reflection").fetch(:unlocked), "잔액 250 < 300이면 회고 구매 불가"
    assert state.call("future").fetch(:unlocked), "누적 적립 450 >= 400"
  end

  test "cheer becomes unavailable once this week's record exists" do
    add_points(Date.new(2026, 9, 8), 100, "week-100")
    record = @user.reward_redemptions.create!(
      reward_kind: "cheer", status: "redeemed", unlocked_at: Time.current, redeemed_at: Time.current,
      period_key: week_key, payload: { "message" => "오늘도 수고했어요" }
    )

    cheer = Rewards::Unlocks.call(user: @user, date: @date).unlocks
      .find { |item| item.fetch(:kind) == "cheer" }

    assert cheer.fetch(:unlocked)
    assert_not cheer.fetch(:available)
    assert_equal "used", cheer.fetch(:reason)
    assert_equal record.id, cheer.fetch(:record).id
  end

  test "an existing recovery hold blocks new unlocks until it is used" do
    add_points(Date.new(2026, 9, 1), 400, "earned-400")
    hold = @user.reward_redemptions.create!(
      reward_kind: "recovery", status: "skipped", unlocked_at: Time.current
    )

    recovery = Rewards::Unlocks.call(user: @user, date: @date).unlocks
      .find { |item| item.fetch(:kind) == "recovery" }

    assert recovery.fetch(:unlocked)
    assert_not recovery.fetch(:available)
    assert_equal "held", recovery.fetch(:reason)
    assert_equal hold.id, recovery.fetch(:record).id, "나중에 하기로 한 보유도 유지된다"
  end

  test "growth stats come from real records" do
    add_points(Date.new(2026, 9, 9), 500, "earned-500")
    FocusSession.create!(
      user: @user,
      source_device: @device,
      kind: "focus",
      status: "completed",
      started_at: Time.zone.parse("2026-09-09 09:00:00"),
      ended_at: Time.zone.parse("2026-09-09 09:40:00"),
      planned_seconds: 3600,
      completed_seconds: 2400,
      start_idempotency_key: "growth-focus-1"
    )
    DailySummary.create!(date: Date.new(2026, 9, 9), all_goals_completed_at: Time.current)

    growth = Rewards::Unlocks.call(user: @user, date: @date).unlocks
      .find { |item| item.fetch(:kind) == "growth" }
    stats = growth.fetch(:stats)

    assert growth.fetch(:unlocked)
    assert_equal "2026-09", stats.fetch(:month)
    assert_equal 40, stats.fetch(:focus_minutes)
    assert_equal 1, stats.fetch(:goal_days)
    assert_equal 1, stats.fetch(:activity_days)
    assert_equal 500, stats.fetch(:points)
    assert_equal 0, stats.fetch(:applications)
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
