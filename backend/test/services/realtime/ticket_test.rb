require "test_helper"

class Realtime::TicketTest < ActiveSupport::TestCase
  setup do
    @device = Devices::Activate.call(
      installation_id: SecureRandom.uuid, name: "Mina's iPhone", platform: "ios"
    ).device
  end

  test "issued ticket resolves back to the device" do
    ticket = Realtime::Ticket.issue(device: @device)

    assert_equal @device.id, Realtime::Ticket.device_for(ticket)&.id
  end

  test "rejects garbage and tampered tickets" do
    assert_nil Realtime::Ticket.device_for("not-a-ticket")
    assert_nil Realtime::Ticket.device_for(nil)
    assert_nil Realtime::Ticket.device_for("#{Realtime::Ticket.issue(device: @device)}tampered")
  end

  test "rejects expired tickets" do
    ticket = Realtime::Ticket.issue(device: @device)

    travel Realtime::Ticket::TTL + 1.minute do
      assert_nil Realtime::Ticket.device_for(ticket)
    end
  end

  test "rejects tickets for revoked devices" do
    ticket = Realtime::Ticket.issue(device: @device)
    @device.update!(revoked_at: Time.current)

    assert_nil Realtime::Ticket.device_for(ticket)
  end
end
