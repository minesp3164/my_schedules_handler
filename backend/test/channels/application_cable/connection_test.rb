require "test_helper"
require "digest"

class ApplicationCable::ConnectionTest < ActionCable::Connection::TestCase
  tests ApplicationCable::Connection

  setup do
    @token = "cable-test-token"
    @device = Device.create!(
      user: User.create!,
      installation_id: SecureRandom.uuid,
      name: "Cable device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
  end

  test "connects only with a valid device token" do
    connect "/cable?token=#{@token}"

    assert_equal @device, connection.current_device
  end

  test "rejects an invalid device token" do
    assert_reject_connection { connect "/cable?token=invalid-token" }
  end
end
