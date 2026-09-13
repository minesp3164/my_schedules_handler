require "test_helper"
require "digest"

class Tasks::CompleteTest < ActiveSupport::TestCase
  setup do
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Test device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest("test-token")
    )
    @task = TaskTemplate.create!(user: @user, title: "알고리즘 1문제", points: 15, target_count: 1, position: 0, kind: "algorithm")
    TaskTemplate.create!(user: @user, title: "이력서 개선", points: 20, target_count: 1, position: 1, kind: "portfolio")
    @now = Time.zone.parse("2026-09-11 10:00:00")
  end

  test "creates one completion and its point ledger event" do
    result = Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-001", now: @now)

    assert_equal 1, DailyTaskCompletion.count
    assert_equal 15, PointEvent.effective.sum(:points)
    assert_equal 15, result.daily_summary.points_total
    assert_equal "task_completion", result.point_events.first.event_type
  end

  test "replays an idempotency key without duplicating points" do
    first = Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-002", now: @now)
    replay = Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-002", now: @now)

    assert_equal first.completion.id, replay.completion.id
    assert replay.replayed
    assert_equal 1, DailyTaskCompletion.count
    assert_equal 15, PointEvent.effective.sum(:points)
  end

  test "rejects a completion beyond the daily target" do
    Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-003", now: @now)

    assert_raises(Tasks::Complete::TargetAlreadyMet) do
      Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-004", now: @now)
    end
  end

  test "reverting a completion removes its effective points" do
    result = Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-005", now: @now)
    _completion, summary = Tasks::Revert.call(completion_id: result.completion.id)

    assert_equal 0, PointEvent.effective.sum(:points)
    assert_equal 0, summary.points_total
  end
end
