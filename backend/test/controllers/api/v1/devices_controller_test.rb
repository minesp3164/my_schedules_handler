require "test_helper"

class Api::V1::DevicesControllerTest < ActionDispatch::IntegrationTest

  test "activates a device and authorizes the returned token" do
    post "/api/v1/devices/activate", params: {
      device: {
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

  test "rejects activation when the access key is wrong" do
    with_access_key("correct-key") do
      post "/api/v1/devices/activate", params: {
        device: {
          installation_id: SecureRandom.uuid,
          name: "Mina's iPhone",
          platform: "ios",
          access_key: "wrong-key"
        }
      }, as: :json

      assert_response :unauthorized
      assert_equal "invalid_access_key", response.parsed_body.dig("error", "code")
    end
  end

  test "rate limits repeated activation attempts" do
    Rails.cache.clear
    headers = { "X-Forwarded-For" => "10.9.8.7" }

    5.times do
      post "/api/v1/devices/activate", params: {
        device: { installation_id: SecureRandom.uuid, name: "iPhone", platform: "ios" }
      }, headers: headers, as: :json
      assert_response :created
    end

    post "/api/v1/devices/activate", params: {
      device: { installation_id: SecureRandom.uuid, name: "iPhone", platform: "ios" }
    }, headers: headers, as: :json
    assert_response :too_many_requests
    assert_equal "rate_limited", response.parsed_body.dig("error", "code")
  ensure
    Rails.cache.clear
  end

  test "revokes the current device token without deleting its record" do
    installation_id = SecureRandom.uuid
    result = Devices::Activate.call(
      installation_id: installation_id, name: "Mina's iPhone", platform: "ios"
    )

    delete "/api/v1/devices/current", headers: { "Authorization" => "Bearer #{result.access_token}" }
    assert_response :no_content
    assert Device.find(result.device.id).revoked_at.present?

    get "/api/v1/task_templates", headers: { "Authorization" => "Bearer #{result.access_token}" }
    assert_response :unauthorized

    restored = Devices::Activate.call(
      installation_id: installation_id, name: "Mina's iPhone", platform: "ios"
    )
    assert_nil restored.device.revoked_at
    assert_equal result.device.id, restored.device.id
  end

  private

  def with_access_key(key)
    original = ENV["PERSONAL_ACCESS_KEY"]
    ENV["PERSONAL_ACCESS_KEY"] = key
    yield
  ensure
    ENV["PERSONAL_ACCESS_KEY"] = original
  end
end
