require "test_helper"
require "digest"

class Api::V1::DashboardAndHistoryControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!
    @token = "dashboard-test-token"
    @headers = { "Authorization" => "Bearer #{@token}" }
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Dashboard device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
    @task = TaskTemplate.create!(user: @user, title: "알고리즘", points: 15, target_count: 2, position: 0, kind: "algorithm")
    @other_task = TaskTemplate.create!(user: @user, title: "포트폴리오", points: 20, target_count: 1, position: 1, kind: "portfolio")
    @date = Date.new(2026, 9, 11)
  end

  test "dashboard returns task progress, daily summary, and the active focus session" do
    completed_at = Time.zone.parse("2026-09-11 09:00:00")
    completion = DailyTaskCompletion.create!(task_template: @task, source_device: @device, completed_on: @date, sequence: 1, completed_at: completed_at)
    PointEvent.create!(user: @user, daily_task_completion: completion, source_device: @device, activity_date: @date, event_type: "task_completion", points: 15, idempotency_key: "dashboard-event", occurred_at: completed_at)
    DailySummary.create!(date: @date, points_total: 15, first_activity_at: completed_at)
    FocusSessions::Start.call(source_device: @device, planned_seconds: 1500, idempotency_key: "dashboard-focus", now: completed_at)

    get "/api/v1/dashboard?date=2026-09-11", headers: @headers

    assert_response :success
    data = response.parsed_body.fetch("data")
    assert_equal "2026-09-11", data.fetch("date")
    assert_equal 15, data.dig("daily_summary", "points_total")
    assert_equal 15, data.fetch("total_points")
    assert_equal 1, data.fetch("tasks").first.fetch("completed_count")
    assert_equal 1, data.fetch("tasks").first.fetch("remaining_count")
    assert_equal 2, data.fetch("tasks").size
    assert_equal "running", data.dig("focus_session", "status")
    assert_equal 100, data.dig("rewards", "daily", "required_points")
    assert_equal 15, data.dig("rewards", "daily", "current_points")
  end

  test "dashboard returns zero values for a date without activity" do
    get "/api/v1/dashboard?date=2026-09-10", headers: @headers

    assert_response :success
    assert_equal 0, response.parsed_body.dig("data", "daily_summary", "points_total")
    assert_equal 0, response.parsed_body.dig("data", "total_points")
    assert_nil response.parsed_body.dig("data", "focus_session")
  end

  test "dashboard only returns tasks scheduled for the requested weekday" do
    @task.update!(weekdays: [5])
    @other_task.update!(weekdays: [1])

    get "/api/v1/dashboard?date=2026-09-11", headers: @headers

    assert_response :success
    assert_equal [@task.id], response.parsed_body.dig("data", "tasks").map { |task| task.fetch("id") }
    assert_equal [5], response.parsed_body.dig("data", "tasks", 0, "weekdays")
  end

  test "history fills the requested range and omits reversed point events" do
    occurred_at = Time.zone.parse("2026-09-11 09:00:00")
    PointEvent.create!(user: @user, source_device: @device, activity_date: @date, event_type: "adjustment", points: 5, idempotency_key: "history-event", occurred_at: occurred_at, reversed_at: occurred_at + 1.hour)
    DailySummary.create!(date: @date, points_total: 0)

    get "/api/v1/history?from=2026-09-10&to=2026-09-11", headers: @headers

    assert_response :success
    days = response.parsed_body.dig("data", "days")
    assert_equal 2, days.size
    assert_equal 0, days.first.dig("summary", "points_total")
    assert_empty days.last.fetch("point_events")
  end

  test "history includes the completed task title in point events" do
    completed_at = Time.zone.parse("2026-09-11 09:00:00")
    completion = DailyTaskCompletion.create!(task_template: @task, source_device: @device, completed_on: @date, sequence: 1, completed_at: completed_at)
    PointEvent.create!(user: @user, daily_task_completion: completion, source_device: @device, activity_date: @date, event_type: "task_completion", points: 15, idempotency_key: "history-task-event", occurred_at: completed_at)
    DailySummary.create!(date: @date, points_total: 15)

    get "/api/v1/history?from=2026-09-11&to=2026-09-11", headers: @headers

    assert_response :success
    assert_equal "알고리즘", response.parsed_body.dig("data", "days", 0, "point_events", 0, "source_title")
  end

  test "history rejects invalid and oversized date ranges" do
    get "/api/v1/history?from=2026-09-12&to=2026-09-11", headers: @headers
    assert_response :unprocessable_entity
    assert_equal "invalid_history_range", response.parsed_body.dig("error", "code")

    get "/api/v1/history?from=2026-09-01&to=2026-10-02", headers: @headers
    assert_response :unprocessable_entity
  end

  test "dashboard splits deferred tasks out of the goal set and pulls deferred-in tasks in" do
    pass = @user.reward_redemptions.create!(reward_kind: "recovery", status: "unlocked", unlocked_at: Time.current)
    TaskDeferral.create!(user: @user, task_template: @task, from_date: @date, to_date: @date + 1, reward_redemption: pass)
    @other_task.update!(weekdays: [1]) # 오늘 스케줄이 아니지만 어제에서 이월되어 옴
    TaskDeferral.create!(user: @user, task_template: @other_task, from_date: @date - 1, to_date: @date)

    get "/api/v1/dashboard?date=2026-09-11", headers: @headers

    assert_response :success
    data = response.parsed_body.fetch("data")
    tasks = data.fetch("tasks")
    assert_equal [@other_task.id], tasks.map { |task| task.fetch("id") }
    assert tasks.first.fetch("deferred_in")

    deferrals = data.fetch("deferrals")
    assert_equal 1, deferrals.size
    assert_equal @task.id, deferrals.first.fetch("task_template_id")
    assert_equal "알고리즘", deferrals.first.fetch("title")
    assert_equal "2026-09-12", deferrals.first.fetch("to_date")
  end

  test "history day includes a recap with goal progress and deferred tasks" do
    pass = @user.reward_redemptions.create!(reward_kind: "recovery", status: "unlocked", unlocked_at: Time.current)
    TaskDeferral.create!(user: @user, task_template: @task, from_date: @date, to_date: @date + 1, reward_redemption: pass)
    completion = DailyTaskCompletion.create!(task_template: @other_task, source_device: @device, completed_on: @date, sequence: 1, completed_at: Time.zone.parse("2026-09-11 09:00:00"))
    PointEvent.create!(user: @user, daily_task_completion: completion, source_device: @device, activity_date: @date, event_type: "task_completion", points: 20, idempotency_key: "recap-event", occurred_at: Time.zone.parse("2026-09-11 09:00:00"))
    DailySummary.create!(date: @date, points_total: 20, first_activity_at: Time.zone.parse("2026-09-11 09:00:00"), all_goals_completed_at: Time.zone.parse("2026-09-11 09:00:00"), daily_bonus_awarded: true)

    get "/api/v1/history?from=2026-09-11&to=2026-09-11", headers: @headers

    assert_response :success
    recap = response.parsed_body.dig("data", "days", 0, "recap")
    assert_equal 1, recap.fetch("tasks_total"), "이월된 @task는 오늘 목표에서 빠진다"
    assert_equal 1, recap.fetch("tasks_done")
    assert recap.fetch("goal_achieved")
    assert_equal 1, recap.fetch("deferred").size
    assert_equal "알고리즘", recap.fetch("deferred").first.fetch("title")
    assert_equal "2026-09-12", recap.fetch("deferred").first.fetch("to_date")
  end
end
