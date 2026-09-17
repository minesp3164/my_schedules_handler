require "test_helper"

class BreakSessionTest < ActiveSupport::TestCase
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
    Setting.instance
    @device = Devices::Activate.call(
      installation_id: SecureRandom.uuid, name: "iPhone", platform: "ios"
    ).device
  end

  test "starting a break session stores kind and shares the active-session lock" do
    result = FocusSessions::Start.call(
      source_device: @device, planned_seconds: 5.minutes.to_i,
      idempotency_key: SecureRandom.uuid, kind: "break"
    )

    assert_equal "break", result.focus_session.kind
    assert result.focus_session.break?

    assert_raises FocusSessions::Start::ActiveFocusSessionExists do
      FocusSessions::Start.call(
        source_device: @device, planned_seconds: 25.minutes.to_i,
        idempotency_key: SecureRandom.uuid
      )
    end
  end

  test "rejects an unknown kind" do
    assert_raises ActiveRecord::RecordInvalid do
      FocusSessions::Start.call(
        source_device: @device, planned_seconds: 5.minutes.to_i,
        idempotency_key: SecureRandom.uuid, kind: "nap"
      )
    end
  end

  test "completing a break session awards no points and no task completion" do
    session = FocusSessions::Start.call(
      source_device: @device, planned_seconds: 5.minutes.to_i,
      idempotency_key: SecureRandom.uuid, kind: "break"
    ).focus_session

    result = nil
    travel_to session.scheduled_end_at do
      result = FocusSessions::Complete.call(
        focus_session: session,
        idempotency_key: SecureRandom.uuid,
        ended_at: session.scheduled_end_at
      )
    end

    assert session.reload.completed?
    assert_nil result.point_event
    assert_nil result.focus_task_completion
    assert_empty result.reward_achievements
    assert_equal 0, PointEvent.where(focus_session: session).count
  end

  test "completing a break session twice replays without error" do
    session = FocusSessions::Start.call(
      source_device: @device, planned_seconds: 5.minutes.to_i,
      idempotency_key: SecureRandom.uuid, kind: "break"
    ).focus_session

    second = nil
    travel_to session.scheduled_end_at do
      FocusSessions::Complete.call(
        focus_session: session, idempotency_key: SecureRandom.uuid, ended_at: session.scheduled_end_at
      )
      second = FocusSessions::Complete.call(
        focus_session: session, idempotency_key: SecureRandom.uuid, ended_at: session.scheduled_end_at
      )
    end

    assert second.replayed
    assert_nil second.point_event
  end

  test "break sessions do not satisfy the dashboard focus completion" do
    session = FocusSessions::Start.call(
      source_device: @device, planned_seconds: 5.minutes.to_i,
      idempotency_key: SecureRandom.uuid, kind: "break"
    ).focus_session
    travel_to session.scheduled_end_at do
      FocusSessions::Complete.call(
        focus_session: session, idempotency_key: SecureRandom.uuid, ended_at: session.scheduled_end_at
      )
    end

    @device.user.task_templates.create!(
      title: "알고리즘", kind: "algorithm", points: 15, target_count: 1, position: 1, weekdays: [0, 1, 2, 3, 4, 5, 6]
    )
    dashboard = Dashboard::Show.call(date: Date.current, user: @device.user)

    assert_empty dashboard.tasks.select { |task| task[:id].to_s.start_with?("focus-completion") }
  end

  test "break sessions are excluded from focus minutes" do
    session = FocusSessions::Start.call(
      source_device: @device, planned_seconds: 5.minutes.to_i,
      idempotency_key: SecureRandom.uuid, kind: "break"
    ).focus_session
    travel_to session.scheduled_end_at do
      FocusSessions::Complete.call(
        focus_session: session, idempotency_key: SecureRandom.uuid, ended_at: session.scheduled_end_at
      )
    end

    assert_equal 0, Milestones::Progress.call(user: @device.user).focus_minutes
  end

  test "auto-complete finishes a break session and still delivers the live activity push" do
    @device.update!(expo_push_token: "ExponentPushToken[test]")
    session = FocusSessions::Start.call(
      source_device: @device, planned_seconds: 5.minutes.to_i,
      idempotency_key: SecureRandom.uuid, kind: "break"
    ).focus_session

    client = FakePushClient.new
    travel_to session.scheduled_end_at + 1.second do
      FocusSessions::AutoComplete.call(focus_session_id: session.id, client: client)
    end

    assert session.reload.completed?
    assert_equal "focus_live_activity_end", client.calls.last[:data][:type]
    assert_equal "휴식 시간 종료", client.calls.last[:title]
    assert_equal 0, PointEvent.where(focus_session: session).count
  end
end
