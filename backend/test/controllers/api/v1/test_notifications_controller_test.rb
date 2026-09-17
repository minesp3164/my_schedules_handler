require "test_helper"

class Api::V1::TestNotificationsControllerTest < ActionDispatch::IntegrationTest

  test "requires a device token" do
    post "/api/v1/notifications/test-nudge", as: :json
    assert_response :unauthorized
  end

  test "rejects when the device has no push channel" do
    result = Devices::Activate.call(
      installation_id: SecureRandom.uuid, name: "iPhone", platform: "ios"
    )

    post "/api/v1/notifications/test-nudge",
         headers: { "Authorization" => "Bearer #{result.access_token}" }, as: :json

    assert_response :unprocessable_entity
    assert_equal "no_push_channel", response.parsed_body.dig("error", "code")
  end

  test "delivers a test nudge to the current device" do
    result = Devices::Activate.call(
      installation_id: SecureRandom.uuid, name: "iPhone", platform: "ios"
    )
    result.device.update!(expo_push_token: "ExponentPushToken[test]")

    with_stubbed_deliver(->(**) { true }) do
      post "/api/v1/notifications/test-nudge",
           headers: { "Authorization" => "Bearer #{result.access_token}" }, as: :json
    end

    assert_response :created
    delivery = result.device.notification_deliveries.last
    assert_equal "daily_nudge_test", delivery.notification_type
    assert_equal "sent", delivery.status
  end

  test "returns an error when the push delivery fails" do
    result = Devices::Activate.call(
      installation_id: SecureRandom.uuid, name: "iPhone", platform: "ios"
    )
    result.device.update!(expo_push_token: "ExponentPushToken[test]")

    failing = ->(**) { raise Notifications::PushClient::DeliveryError, "Expo Push 응답 503" }
    with_stubbed_deliver(failing) do
      post "/api/v1/notifications/test-nudge",
           headers: { "Authorization" => "Bearer #{result.access_token}" }, as: :json
    end

    assert_response :unprocessable_entity
    assert_equal "delivery_failed", response.parsed_body.dig("error", "code")
    assert_equal "failed", result.device.notification_deliveries.last.status
  end

  private

  def with_stubbed_deliver(implementation)
    original = Notifications::PushClient.instance_method(:deliver)
    Notifications::PushClient.define_method(:deliver) { |**kwargs| instance_exec(**kwargs, &implementation) }
    yield
  ensure
    Notifications::PushClient.define_method(:deliver, original)
  end
end
