require "test_helper"
require "digest"

class Api::V1::SettingsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @token = "settings-test-token"
    @headers = { "Authorization" => "Bearer #{@token}" }
    Device.create!(
      installation_id: SecureRandom.uuid,
      name: "Settings device",
      platform: "ios",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
  end

  test "returns the singleton setting with personal defaults" do
    get "/api/v1/settings", headers: @headers

    assert_response :success
    assert_equal 25, response.parsed_body.dig("data", "focus_minutes")
    assert_equal 5, response.parsed_body.dig("data", "break_minutes")
    assert_equal true, response.parsed_body.dig("data", "nudge_enabled")
    assert_equal "13:00", response.parsed_body.dig("data", "nudge_at")
    assert_equal "Asia/Seoul", response.parsed_body.dig("data", "timezone")
    assert_equal 10, response.parsed_body.dig("data", "focus_completion_points")
    assert_equal 30, response.parsed_body.dig("data", "daily_bonus_points")
    assert_equal 1, Setting.count
  end

  test "updates allowed settings while keeping the timezone fixed" do
    patch "/api/v1/settings", params: {
      settings: {
        focus_minutes: 50,
        break_minutes: 10,
        nudge_enabled: false,
        nudge_at: "12:30",
        focus_completion_points: 12,
        daily_bonus_points: 35,
        daily_reward_points: 120,
        weekly_reward_points: 350,
        daily_reward_text: "오늘 목표 달성!",
        weekly_reward_text: "이번 주 목표 달성!",
        timezone: "UTC"
      }
    }, headers: @headers, as: :json

    assert_response :success
    data = response.parsed_body.fetch("data")
    assert_equal 50, data.fetch("focus_minutes")
    assert_equal false, data.fetch("nudge_enabled")
    assert_equal "12:30", data.fetch("nudge_at")
    assert_equal "Asia/Seoul", data.fetch("timezone")
    assert_equal 12, data.fetch("focus_completion_points")
    assert_equal 35, data.fetch("daily_bonus_points")
    assert_equal 120, data.fetch("daily_reward_points")
    assert_equal "오늘 목표 달성!", data.fetch("daily_reward_text")
  end

  test "rejects invalid durations, rewards, and nudge times" do
    patch "/api/v1/settings", params: { settings: { focus_minutes: 0 } }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    patch "/api/v1/settings", params: { settings: { nudge_at: "25:00" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    patch "/api/v1/settings", params: { settings: { weekly_reward_points: 0 } }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    patch "/api/v1/settings", params: { settings: { focus_completion_points: -1 } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end
end
