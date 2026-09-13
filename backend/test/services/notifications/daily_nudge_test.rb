require "test_helper"
require "digest"

class Notifications::DailyNudgeTest < ActiveSupport::TestCase
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
    @device = Device.create!(
      user: User.create!,
      installation_id: SecureRandom.uuid,
      name: "Nudge device",
      platform: "ios",
      access_token_digest: Digest::SHA256.hexdigest("nudge-token"),
      expo_push_token: "ExponentPushToken[test]"
    )
    @client = FakePushClient.new
    @now = Time.zone.parse("2026-09-11 13:00:00")
    Setting.instance.update!(nudge_enabled: true, nudge_at: "13:00")
  end

  test "sends one nudge at the configured time when there is no activity" do
    first = Notifications::DailyNudge.call(now: @now, client: @client)
    replay = Notifications::DailyNudge.call(now: @now, client: @client)

    assert_equal 1, first.size
    assert first.first.sent
    assert_equal 1, @client.calls.size
    assert_equal "daily_nudge", NotificationDelivery.last.notification_type
    assert replay.first.duplicate
    assert_equal 1, @client.calls.size
  end

  test "does not send before the configured time or after activity starts" do
    assert_empty Notifications::DailyNudge.call(now: @now - 1.minute, client: @client)

    DailySummary.create!(date: @now.to_date, first_activity_at: @now - 10.minutes)
    assert_empty Notifications::DailyNudge.call(now: @now, client: @client)
    assert_empty @client.calls
  end

  test "does not send when daily nudge is disabled" do
    Setting.instance.update!(nudge_enabled: false)

    assert_empty Notifications::DailyNudge.call(now: @now, client: @client)
    assert_empty @client.calls
  end
end
