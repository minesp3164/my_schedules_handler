require "test_helper"
require "digest"

class Api::V1::BadgesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @token = "badge-ctrl-token"
    @headers = { "Authorization" => "Bearer #{@token}" }
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Badge controller",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
  end

  test "index requires a device token" do
    get "/api/v1/badges"

    assert_response :unauthorized
    assert_equal "unauthorized", response.parsed_body.dig("error", "code")
  end

  test "index evaluates badges and returns rules with progress" do
    TaskTemplate.create!(user: @user, title: "첫 루틴", points: 10, target_count: 1, position: 0, kind: "custom")

    get "/api/v1/badges", headers: @headers

    assert_response :success
    data = response.parsed_body.fetch("data")
    badges = data.fetch("badges")

    assert_equal 63, badges.size
    assert_equal %w[routine_first routine_designer routine_7 routine_system],
      badges.first(4).map { |badge| badge.fetch("key") }
    assert_equal "routine", badges.first.fetch("category")
    assert_equal "created_tasks", badges.first.fetch("metric")
    assert_equal 1, badges.first.fetch("threshold")

    routine_first = badges.find { |badge| badge.fetch("key") == "routine_first" }
    assert routine_first.fetch("achieved_at").present?
    routine_system = badges.find { |badge| badge.fetch("key") == "routine_system" }
    assert_nil routine_system.fetch("achieved_at")

    progress = data.fetch("progress")
    assert_equal 1, progress.fetch("created_tasks")
    assert_equal 0, progress.fetch("activity_days")
    assert progress.key?("application_completions")
    assert progress.key?("first_activity_date")
  end

  test "index revokes achievements when a cancelled completion drops below the threshold" do
    task = TaskTemplate.create!(user: @user, title: "첫 루틴", points: 10, target_count: 1, position: 0, kind: "custom")
    completion = DailyTaskCompletion.create!(task_template: task, source_device: @device, completed_on: Date.new(2026, 9, 10), completed_at: Time.zone.parse("2026-09-10 10:00"), sequence: 1)

    get "/api/v1/badges", headers: @headers

    assert_response :success
    badges = response.parsed_body.fetch("data").fetch("badges")
    assert badges.find { |badge| badge.fetch("key") == "steady_done_1" }.fetch("achieved_at").present?

    completion.update!(reverted_at: Time.zone.parse("2026-09-10 11:00"))
    get "/api/v1/badges", headers: @headers

    badges = response.parsed_body.fetch("data").fetch("badges")
    assert_nil badges.find { |badge| badge.fetch("key") == "steady_done_1" }.fetch("achieved_at")
    assert badges.find { |badge| badge.fetch("key") == "routine_first" }.fetch("achieved_at").present?
  end
end
