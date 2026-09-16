require "test_helper"

class Devices::ActivateTest < ActiveSupport::TestCase

  test "activates a device and returns a token stored only as a digest" do
    result = Devices::Activate.call(
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
    first = Devices::Activate.call(installation_id: installation_id, name: "Mina's web", platform: "web")
    second = Devices::Activate.call(installation_id: installation_id, name: "Mina's web", platform: "web")

    assert_equal first.device.id, second.device.id
    assert_not_equal first.access_token, second.access_token
    assert_equal 1, Device.where(installation_id: installation_id).count
  end

  test "attaches every device to the same single user" do
    first = Devices::Activate.call(installation_id: SecureRandom.uuid, name: "iPhone", platform: "ios")
    second = Devices::Activate.call(installation_id: SecureRandom.uuid, name: "Web", platform: "web")

    assert_equal first.device.user_id, second.device.user_id
    assert_equal 1, User.count
  end

  test "rejects activation with a wrong access key when a key is configured" do
    with_access_key("correct-key") do
      assert_raises Devices::Activate::InvalidAccessKey do
        Devices::Activate.call(
          installation_id: SecureRandom.uuid, name: "iPhone", platform: "ios", access_key: "wrong-key"
        )
      end

      assert_raises Devices::Activate::InvalidAccessKey do
        Devices::Activate.call(
          installation_id: SecureRandom.uuid, name: "iPhone", platform: "ios"
        )
      end

      result = Devices::Activate.call(
        installation_id: SecureRandom.uuid, name: "iPhone", platform: "ios", access_key: "correct-key"
      )
      assert result.device.persisted?
    end
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
