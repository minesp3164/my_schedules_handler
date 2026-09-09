require "test_helper"

class Devices::ActivateTest < ActiveSupport::TestCase
  setup { ENV["SETUP_KEY"] = "a-very-long-test-only-setup-key-123456" }

  teardown { ENV.delete("SETUP_KEY") }

  test "activates a device and returns a token stored only as a digest" do
    result = Devices::Activate.call(
      setup_key: ENV.fetch("SETUP_KEY"),
      installation_id: SecureRandom.uuid,
      name: "Mina's iPhone",
      platform: "ios"
    )

    assert result.access_token.present?
    assert_equal Digest::SHA256.hexdigest(result.access_token), result.device.access_token_digest
    assert_equal "ios", result.device.platform
  end

  test "rotates the token when the same installation activates again" do
    installation_id = SecureRandom.uuid
    first = Devices::Activate.call(setup_key: ENV.fetch("SETUP_KEY"), installation_id: installation_id, name: "Mina's web", platform: "web")
    second = Devices::Activate.call(setup_key: ENV.fetch("SETUP_KEY"), installation_id: installation_id, name: "Mina's web", platform: "web")

    assert_equal first.device.id, second.device.id
    assert_not_equal first.access_token, second.access_token
    assert_equal 1, Device.where(installation_id: installation_id).count
  end

  test "rejects an invalid setup key" do
    assert_raises(Devices::Activate::InvalidSetupKey) do
      Devices::Activate.call(setup_key: "wrong-key", installation_id: SecureRandom.uuid, name: "Unknown", platform: "web")
    end
  end
end
