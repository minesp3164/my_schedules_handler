require "test_helper"
require "digest"

class FocusSessions::LifecycleTest < ActiveSupport::TestCase
  setup do
    @device = Device.create!(
      installation_id: SecureRandom.uuid,
      name: "Timer test device",
      platform: "ios",
      access_token_digest: Digest::SHA256.hexdigest("timer-test-token")
    )
    @now = Time.zone.parse("2026-09-11 10:00:00")
  end

  test "starts one active session and blocks another" do
    result = FocusSessions::Start.call(source_device: @device, planned_seconds: 100, idempotency_key: "focus-start-001", now: @now)

    assert result.focus_session.running?
    assert_equal 1, result.focus_session.active_lock
    assert_equal @now, DailySummary.find_by!(date: @now.to_date).first_activity_at

    assert_raises(FocusSessions::Start::ActiveFocusSessionExists) do
      FocusSessions::Start.call(source_device: @device, planned_seconds: 100, idempotency_key: "focus-start-002", now: @now)
    end
  end

  test "pauses resumes and awards points after sufficient focus time" do
    session = FocusSessions::Start.call(source_device: @device, planned_seconds: 100, idempotency_key: "focus-start-003", now: @now).focus_session
    FocusSessions::Pause.call(focus_session: session, now: @now + 20.seconds)
    FocusSessions::Resume.call(focus_session: session, now: @now + 50.seconds)
    result = FocusSessions::Complete.call(focus_session: session, idempotency_key: "focus-complete-001", ended_at: @now + 160.seconds)

    assert result.focus_session.completed?
    assert_equal 30, result.focus_session.paused_seconds
    assert_equal 130, result.focus_session.completed_seconds
    assert_equal 10, result.point_event.points
    assert_nil result.focus_session.active_lock
  end

  test "does not award a session shorter than 80 percent" do
    session = FocusSessions::Start.call(source_device: @device, planned_seconds: 100, idempotency_key: "focus-start-004", now: @now).focus_session

    assert_raises(FocusSessions::Complete::TooShort) do
      FocusSessions::Complete.call(focus_session: session, idempotency_key: "focus-complete-002", ended_at: @now + 79.seconds)
    end

    assert session.reload.running?
    assert_equal 0, PointEvent.count
  end

  test "cancel releases the active timer lock for the next session" do
    session = FocusSessions::Start.call(source_device: @device, planned_seconds: 100, idempotency_key: "focus-start-005", now: @now).focus_session
    FocusSessions::Cancel.call(focus_session: session, now: @now + 10.seconds)
    replacement = FocusSessions::Start.call(source_device: @device, planned_seconds: 100, idempotency_key: "focus-start-006", now: @now + 11.seconds).focus_session

    assert session.reload.cancelled?
    assert replacement.running?
  end
end
