require "test_helper"

class Api::V1::DevicesControllerTest < ActionDispatch::IntegrationTest
  setup { ENV["SETUP_KEY"] = "a-very-long-test-only-setup-key-123456" }

  teardown { ENV.delete("SETUP_KEY") }

  test "activates a device and authorizes the returned token" do
    post "/api/v1/devices/activate", params: {
      device: {
        setup_key: ENV.fetch("SETUP_KEY"),
        installation_id: SecureRandom.uuid,
        name: "Mina's iPhone",
        platform: "ios"
      }
    }, as: :json

    assert_response :created
    token = response.parsed_body.dig("data", "access_token")
    assert token.present?

    get "/api/v1/task_templates", headers: { "Authorization" => "Bearer #{token}" }
    assert_response :success
  end

  test "does not activate a device with the wrong setup key" do
    post "/api/v1/devices/activate", params: {
      device: {
        setup_key: "wrong-key",
        installation_id: SecureRandom.uuid,
        name: "Unknown",
        platform: "web"
      }
    }, as: :json

    assert_response :unauthorized
    assert_equal "invalid_setup_key", response.parsed_body.dig("error", "code")
  end

  test "revokes the current device token without deleting its record" do
    installation_id = SecureRandom.uuid
    result = Devices::Activate.call(
      setup_key: ENV.fetch("SETUP_KEY"), installation_id: installation_id, name: "Mina's iPhone", platform: "ios"
    )

    delete "/api/v1/devices/current", headers: { "Authorization" => "Bearer #{result.access_token}" }
    assert_response :no_content
    assert Device.find(result.device.id).revoked_at.present?

    get "/api/v1/task_templates", headers: { "Authorization" => "Bearer #{result.access_token}" }
    assert_response :unauthorized

    restored = Devices::Activate.call(
      setup_key: ENV.fetch("SETUP_KEY"), installation_id: installation_id, name: "Mina's iPhone", platform: "ios"
    )
    assert_nil restored.device.revoked_at
    assert_equal result.device.id, restored.device.id
  end
end
