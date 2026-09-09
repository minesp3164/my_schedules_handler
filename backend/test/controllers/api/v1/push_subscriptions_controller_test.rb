require "test_helper"
require "digest"

class Api::V1::PushSubscriptionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @token = "push-subscription-token"
    @headers = { "Authorization" => "Bearer #{@token}" }
    @device = Device.create!(
      installation_id: SecureRandom.uuid,
      name: "Push device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
  end

  test "registers an Expo Push token for the current device" do
    post "/api/v1/push_subscription", params: { push_subscription: { expo_push_token: "ExponentPushToken[abc]" } }, headers: @headers, as: :json

    assert_response :success
    assert_equal "expo", response.parsed_body.dig("data", "push_channel")
    assert_equal "ExponentPushToken[abc]", @device.reload.expo_push_token
  end

  test "rejects an incomplete Web Push subscription" do
    post "/api/v1/push_subscription", params: { push_subscription: { web_push_subscription: { endpoint: "https://push.example.test" } } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "invalid_push_subscription", response.parsed_body.dig("error", "code")
  end
end
