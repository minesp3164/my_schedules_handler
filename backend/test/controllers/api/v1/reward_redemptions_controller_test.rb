require "test_helper"
require "digest"

class Api::V1::RewardRedemptionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @token = "redemption-ctrl-token"
    @headers = { "Authorization" => "Bearer #{@token}" }
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Redemption controller",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
    Setting.instance
  end

  test "index returns records with unlock status fields" do
    @user.reward_redemptions.create!(
      reward_kind: "recovery", status: "unlocked", unlocked_at: Time.current
    )

    get "/api/v1/reward-redemptions", headers: @headers

    assert_response :success
    record = response.parsed_body.fetch("data").first
    assert_equal "recovery", record.fetch("reward_kind")
    assert_equal "unlocked", record.fetch("status")
    assert_nil record.fetch("cost_points")
    assert_nil record.fetch("redeemed_at")
  end

  test "cheer claim spends no points and enforces the weekly limit" do
    add_points(100)

    assert_no_difference "PointEvent.count" do
      post "/api/v1/reward-redemptions",
        params: { reward_kind: "cheer", payload: { message: "오늘도 수고했어요" } },
        headers: @headers.merge("Idempotency-Key" => "cheer-ctrl-1"), as: :json
    end

    assert_response :created
    data = response.parsed_body.fetch("data")
    assert_equal "cheer", data.fetch("reward_kind")
    assert_equal "redeemed", data.fetch("status")
    assert_equal 100, data.fetch("remaining_points"), "응원 보내기는 포인트를 쓰지 않는다"

    post "/api/v1/reward-redemptions",
      params: { reward_kind: "cheer", payload: { message: "두 번째" } },
      headers: @headers.merge("Idempotency-Key" => "cheer-ctrl-2"), as: :json

    assert_response :conflict
    assert_equal "reward_limit", response.parsed_body.dig("error", "code")
  end

  test "recovery hold can be deferred and restored but not marked used" do
    add_points(300)

    post "/api/v1/reward-redemptions",
      params: { reward_kind: "recovery" },
      headers: @headers.merge("Idempotency-Key" => "rec-ctrl-1"), as: :json

    assert_response :created
    record_id = response.parsed_body.dig("data", "id")
    assert_equal "unlocked", response.parsed_body.dig("data", "status")

    post "/api/v1/reward-redemptions",
      params: { reward_kind: "recovery" },
      headers: @headers.merge("Idempotency-Key" => "rec-ctrl-2"), as: :json
    assert_response :conflict
    assert_equal "reward_limit", response.parsed_body.dig("error", "code")

    patch "/api/v1/reward-redemptions/#{record_id}", params: { status: "skipped" }, headers: @headers, as: :json
    assert_response :success
    assert_equal "skipped", response.parsed_body.dig("data", "status")

    patch "/api/v1/reward-redemptions/#{record_id}", params: { status: "unlocked" }, headers: @headers, as: :json
    assert_response :success
    assert_equal "unlocked", response.parsed_body.dig("data", "status")

    patch "/api/v1/reward-redemptions/#{record_id}", params: { status: "redeemed" }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "invalid_status", response.parsed_body.dig("error", "code")
  end

  test "locked kinds are rejected with reward_locked" do
    post "/api/v1/reward-redemptions",
      params: { reward_kind: "growth", payload: {} },
      headers: @headers.merge("Idempotency-Key" => "grow-ctrl-1"), as: :json

    assert_response :conflict
    assert_equal "reward_locked", response.parsed_body.dig("error", "code")
  end

  test "unknown kinds are rejected" do
    post "/api/v1/reward-redemptions",
      params: { reward_kind: "slot_machine" },
      headers: @headers.merge("Idempotency-Key" => "bad-1"), as: :json

    assert_response :unprocessable_entity
    assert_equal "unknown_reward", response.parsed_body.dig("error", "code")
  end

  test "updates cannot touch another user's record" do
    other_user = User.create!
    record = other_user.reward_redemptions.create!(
      reward_kind: "recovery", status: "unlocked", unlocked_at: Time.current
    )

    patch "/api/v1/reward-redemptions/#{record.id}", params: { status: "skipped" }, headers: @headers, as: :json

    assert_response :not_found
  end

  private

  def add_points(points)
    date = Date.current
    PointEvent.create!(
      user: @user,
      source_device: @device,
      activity_date: date,
      event_type: "adjustment",
      points: points,
      idempotency_key: "redemption-ctrl-#{SecureRandom.hex(4)}",
      occurred_at: Time.current
    )
  end
end
