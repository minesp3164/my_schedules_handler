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

  test "history fills the requested range and includes reversed point events" do
    occurred_at = Time.zone.parse("2026-09-11 09:00:00")
    PointEvent.create!(user: @user, source_device: @device, activity_date: @date, event_type: "adjustment", points: 5, idempotency_key: "history-event", occurred_at: occurred_at, reversed_at: occurred_at + 1.hour)
    DailySummary.create!(date: @date, points_total: 0)

    get "/api/v1/history?from=2026-09-10&to=2026-09-11", headers: @headers

    assert_response :success
    days = response.parsed_body.dig("data", "days")
    assert_equal 2, days.size
    assert_equal 0, days.first.dig("summary", "points_total")
    assert_equal "adjustment", days.last.dig("point_events", 0, "event_type")
    assert days.last.dig("point_events", 0, "reversed_at").present?
  end

  test "history rejects invalid and oversized date ranges" do
    get "/api/v1/history?from=2026-09-12&to=2026-09-11", headers: @headers
    assert_response :unprocessable_entity
    assert_equal "invalid_history_range", response.parsed_body.dig("error", "code")

    get "/api/v1/history?from=2026-09-01&to=2026-10-02", headers: @headers
    assert_response :unprocessable_entity
  end
end
