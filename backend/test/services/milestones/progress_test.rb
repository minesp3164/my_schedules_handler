require "test_helper"

class Milestones::ProgressTest < ActiveSupport::TestCase
  setup do
    @user = User.create!
    @other_user = User.create!
    @device = Device.create!(user: @user, installation_id: SecureRandom.uuid, name: "Milestone device", platform: "web", access_token_digest: "milestone-token")
    @task = TaskTemplate.create!(user: @user, title: "오늘의 할 일", points: 20, target_count: 1, position: 0, kind: "custom")
  end

  test "summarizes only the current user's effective activity" do
    completion = DailyTaskCompletion.create!(task_template: @task, source_device: @device, completed_on: Date.new(2026, 9, 10), completed_at: Time.zone.parse("2026-09-10 10:00"), sequence: 1)
    PointEvent.create!(user: @user, source_device: @device, daily_task_completion: completion, activity_date: Date.new(2026, 9, 10), event_type: "task_completion", points: 20, idempotency_key: "milestone-task", occurred_at: Time.zone.parse("2026-09-10 10:00"))
    PointEvent.create!(user: @user, source_device: @device, activity_date: Date.new(2026, 9, 11), event_type: "adjustment", points: 10, idempotency_key: "milestone-adjustment", occurred_at: Time.zone.parse("2026-09-11 10:00"))
    FocusSession.create!(user: @user, source_device: @device, started_at: Time.zone.parse("2026-09-11 11:00"), planned_seconds: 1500, completed_seconds: 1500, status: "completed", start_idempotency_key: "milestone-focus")
    other_device = Device.create!(user: @other_user, installation_id: SecureRandom.uuid, name: "Other device", platform: "web", access_token_digest: "other-milestone-token")
    PointEvent.create!(user: @other_user, source_device: other_device, activity_date: Date.new(2026, 9, 12), event_type: "adjustment", points: 10, idempotency_key: "other-milestone", occurred_at: Time.zone.parse("2026-09-12 10:00"))

    result = Milestones::Progress.call(user: @user)

    assert_equal 2, result.activity_days
    assert_equal 25, result.focus_minutes
    assert_equal 1, result.completed_tasks
    assert_equal 1, result.created_tasks
  end
end
