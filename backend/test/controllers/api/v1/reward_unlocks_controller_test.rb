require "test_helper"
require "digest"

class Api::V1::RewardUnlocksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @token = "unlock-ctrl-token"
    @headers = { "Authorization" => "Bearer #{@token}" }
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Unlock controller",
      platform: "android",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
  end

  test "index requires a device token" do
    get "/api/v1/reward-unlocks"

    assert_response :unauthorized
    assert_equal "unauthorized", response.parsed_body.dig("error", "code")
  end

  test "index returns every unlock state" do
    add_points(500)

    get "/api/v1/reward-unlocks", headers: @headers

    assert_response :success
    data = response.parsed_body.fetch("data")
    assert_equal 500, data.fetch("earned_points")
    assert_equal 500, data.fetch("total_points")

    unlocks = data.fetch("unlocks")
    assert_equal %w[cheer future growth recovery reflection],
      unlocks.map { |state| state.fetch("kind") }.sort
    growth = unlocks.find { |state| state.fetch("kind") == "growth" }
    assert growth.fetch("unlocked")
    assert growth.fetch("stats").key?("focus_minutes")

    reflection = unlocks.find { |state| state.fetch("kind") == "reflection" }
    assert_equal "balance", reflection.fetch("unit")
    assert_nil reflection.fetch("record")
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
      idempotency_key: "unlock-ctrl-#{SecureRandom.hex(4)}",
      occurred_at: Time.current
    )
  end
end
