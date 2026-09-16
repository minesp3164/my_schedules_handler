require "test_helper"

class ApplicationCable::ConnectionTest < ActionCable::Connection::TestCase
  tests ApplicationCable::Connection

  setup do
    @device = Device.create!(
      user: User.create!,
      installation_id: SecureRandom.uuid,
      name: "Cable device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest(SecureRandom.urlsafe_base64(32))
    )
  end

  test "connects with a valid realtime ticket" do
    ticket = Realtime::Ticket.issue(device: @device)

    connect "/cable?ticket=#{ticket}"

    assert_equal @device, connection.current_device
  end

  test "rejects an invalid ticket" do
    assert_reject_connection { connect "/cable?ticket=invalid-ticket" }
  end

  test "rejects a raw device token" do
    assert_reject_connection { connect "/cable?token=whatever" }
  end
end
