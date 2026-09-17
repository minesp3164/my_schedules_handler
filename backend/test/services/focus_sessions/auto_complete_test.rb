require "test_helper"
require "digest"

class FocusSessions::AutoCompleteTest < ActiveSupport::TestCase
  class FakePushClient
    attr_reader :calls

    def initialize
      @calls = []
    end

    def deliver(**arguments)
      @calls << arguments
    end
  end

  setup do
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Focus iPhone",
      platform: "ios",
      access_token_digest: Digest::SHA256.hexdigest("focus-auto-complete"),
      expo_push_token: "ExponentPushToken[focus]"
    )
    @client = FakePushClient.new
  end

  test "completes the session and sends a silent push after the end passes" do
    session = create_session(started_at: 30.minutes.ago)

    result = FocusSessions::AutoComplete.call(focus_session_id: session.id, client: @client)

    assert result
    assert_not result.replayed
    assert session.reload.completed?
    assert_equal session.planned_seconds, session.completed_seconds
    assert session.point_event.present?
    assert_equal 1, @client.calls.size
    assert @client.calls.first[:silent]
    assert_equal "focus_live_activity_end", @client.calls.first[:data][:type]
    assert_equal "focus_live_activity_end", NotificationDelivery.last.notification_type
  end

  test "is idempotent and still ends the live activity on replay" do
    session = create_session(started_at: 30.minutes.ago)

    FocusSessions::AutoComplete.call(focus_session_id: session.id, client: @client)
    second = FocusSessions::AutoComplete.call(focus_session_id: session.id, client: @client)

    assert_nil second
    assert_equal 1, @client.calls.size
    assert_equal 1, PointEvent.where(focus_session: session).count
  end

  test "skips while time remains and while paused" do
    session = create_session(started_at: 1.minute.ago)
    assert_nil FocusSessions::AutoComplete.call(focus_session_id: session.id, client: @client)
    assert session.reload.running?

    session.update!(started_at: 30.minutes.ago, status: "paused", paused_at: Time.current)
    assert_nil FocusSessions::AutoComplete.call(focus_session_id: session.id, client: @client)
    assert session.reload.paused?

    assert_empty @client.calls
  end

  test "completes the session even without a push token" do
    @device.update!(expo_push_token: nil)
    session = create_session(started_at: 30.minutes.ago)

    result = FocusSessions::AutoComplete.call(focus_session_id: session.id, client: @client)

    assert_not result.replayed
    assert session.reload.completed?
    assert_empty @client.calls
  end

  private

  def create_session(started_at:)
    FocusSession.create!(
      user: @user,
      source_device: @device,
      started_at: started_at,
      planned_seconds: 25 * 60,
      status: "running",
      paused_seconds: 0,
      active_lock: 1,
      start_idempotency_key: SecureRandom.uuid
    )
  end
end
