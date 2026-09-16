require "test_helper"
require "digest"

class Api::V1::WeeklyRetrosControllerTest < ActionDispatch::IntegrationTest
  setup do
    @token = "retro-test-token"
    @headers = { "Authorization" => "Bearer #{@token}" }
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Retro device",
      platform: "ios",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
    Setting.instance
  end

  test "show returns empty retro for a week without one" do
    get "/api/v1/weekly-retro", params: { week_start: "2026-03-02" }, headers: @headers

    assert_response :success
    data = response.parsed_body.fetch("data")
    assert_equal "2026-03-02", data.fetch("week_start")
    assert_nil data.fetch("body")
  end

  test "update creates a retro and show reads it back" do
    seed_points(400)
    put "/api/v1/weekly-retro", params: { week_start: "2026-03-02", body: "이번 주는 목요일이 전부였다" }, headers: @headers, as: :json

    assert_response :success
    assert_equal "이번 주는 목요일이 전부였다", response.parsed_body.dig("data", "body")
    assert_equal 1, @user.weekly_retros.count

    get "/api/v1/weekly-retro", params: { week_start: "2026-03-02" }, headers: @headers
    assert_equal "이번 주는 목요일이 전부였다", response.parsed_body.dig("data", "body")
  end

  test "creating a retro redeems the reflection reward once" do
    seed_points(400)
    put "/api/v1/weekly-retro", params: { week_start: "2026-03-02", body: "첫 회고" }, headers: @headers, as: :json

    assert_response :success
    redemption = RewardRedemption.find_by!(user: @user, reward_kind: "reflection")
    assert_equal 300, redemption.cost_points
    assert_equal 100, @user.point_events.effective.sum(:points)
  end

  test "editing the same week does not charge again" do
    seed_points(400)
    put "/api/v1/weekly-retro", params: { week_start: "2026-03-02", body: "첫 회고" }, headers: @headers, as: :json
    put "/api/v1/weekly-retro", params: { week_start: "2026-03-04", body: "수정된 회고" }, headers: @headers, as: :json

    assert_response :success
    assert_equal 1, @user.weekly_retros.count
    assert_equal "수정된 회고", @user.weekly_retros.first.body
    assert_equal 1, RewardRedemption.where(user: @user, reward_kind: "reflection").count
    assert_equal 100, @user.point_events.effective.sum(:points)
  end

  test "deleting and rewriting in the same week does not charge again" do
    seed_points(400)
    put "/api/v1/weekly-retro", params: { week_start: "2026-03-02", body: "지울 회고" }, headers: @headers, as: :json
    put "/api/v1/weekly-retro", params: { week_start: "2026-03-02", body: "" }, headers: @headers, as: :json
    put "/api/v1/weekly-retro", params: { week_start: "2026-03-02", body: "다시 쓴 회고" }, headers: @headers, as: :json

    assert_response :success
    assert_equal 1, @user.weekly_retros.count
    assert_equal 100, @user.point_events.effective.sum(:points)
  end

  test "update normalizes any date to its week monday" do
    seed_points(400)
    put "/api/v1/weekly-retro", params: { week_start: "2026-03-05", body: "목요일에 써도 같은 주" }, headers: @headers, as: :json

    assert_response :success
    assert_equal "2026-03-02", response.parsed_body.dig("data", "week_start")
    assert_equal Date.new(2026, 3, 2), @user.weekly_retros.first.week_start
  end

  test "blank body deletes the retro" do
    seed_points(400)
    put "/api/v1/weekly-retro", params: { week_start: "2026-03-02", body: "지울 회고" }, headers: @headers, as: :json
    put "/api/v1/weekly-retro", params: { week_start: "2026-03-02", body: "" }, headers: @headers, as: :json

    assert_response :success
    assert_equal 0, @user.weekly_retros.count
    assert_nil response.parsed_body.dig("data", "body")
  end

  test "rejects creation without enough points" do
    seed_points(299)
    put "/api/v1/weekly-retro", params: { week_start: "2026-03-02", body: "포인트 부족" }, headers: @headers, as: :json

    assert_response :conflict
    assert_equal "insufficient_points", response.parsed_body.dig("error", "code")
    assert_equal 0, @user.weekly_retros.count
  end

  test "rejects body longer than 500 characters" do
    seed_points(400)
    put "/api/v1/weekly-retro", params: { week_start: "2026-03-02", body: "가" * 501 }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "validation_failed", response.parsed_body.dig("error", "code")
  end

  test "rejects malformed week_start" do
    get "/api/v1/weekly-retro", params: { week_start: "next-monday" }, headers: @headers

    assert_response :unprocessable_entity
    assert_equal "invalid_date", response.parsed_body.dig("error", "code")
  end

  test "requires device token" do
    get "/api/v1/weekly-retro", params: { week_start: "2026-03-02" }

    assert_response :unauthorized
  end

  private

  def seed_points(amount)
    PointEvent.create!(
      user: @user,
      source_device: @device,
      activity_date: Date.current,
      event_type: "adjustment",
      points: amount,
      idempotency_key: SecureRandom.uuid,
      occurred_at: Time.current
    )
  end
end
