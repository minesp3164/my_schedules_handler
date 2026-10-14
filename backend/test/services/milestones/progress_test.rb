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
    assert_equal 0, result.application_completions
    assert_equal 0, result.algorithm_completions
    assert_equal 0, result.portfolio_completions
    assert_equal Date.new(2026, 9, 10), result.first_activity_date
  end

  test "counts completions per task kind" do
    application = TaskTemplate.create!(user: @user, title: "실제 지원 1건", points: 25, target_count: 5, position: 1, kind: "application")
    algorithm = TaskTemplate.create!(user: @user, title: "알고리즘 1문제", points: 1, target_count: 3, position: 2, kind: "algorithm")
    research = TaskTemplate.create!(user: @user, title: "기업 리서치", points: 10, target_count: 3, position: 3, kind: "research")
    DailyTaskCompletion.create!(task_template: application, source_device: @device, completed_on: Date.new(2026, 9, 10), completed_at: Time.zone.parse("2026-09-10 10:00"), sequence: 1)
    DailyTaskCompletion.create!(task_template: application, source_device: @device, completed_on: Date.new(2026, 9, 11), completed_at: Time.zone.parse("2026-09-11 10:00"), sequence: 1)
    DailyTaskCompletion.create!(task_template: algorithm, source_device: @device, completed_on: Date.new(2026, 9, 10), completed_at: Time.zone.parse("2026-09-10 12:00"), sequence: 1)
    DailyTaskCompletion.create!(task_template: research, source_device: @device, completed_on: Date.new(2026, 9, 10), completed_at: Time.zone.parse("2026-09-10 13:00"), sequence: 1)

    result = Milestones::Progress.call(user: @user)

    # 리서치 완료는 전체 완료에는 들지만 지원 배지 지표(application_completions)에는 섞이지 않는다.
    assert_equal 4, result.completed_tasks
    assert_equal 2, result.application_completions
    assert_equal 1, result.algorithm_completions
    assert_equal 0, result.portfolio_completions
    assert_equal 4, result.created_tasks
    assert_nil result.first_activity_date
  end
end
