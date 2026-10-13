require "test_helper"
require "digest"

class Api::V1::TaskTemplates::CompletionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!
    @token = "completions-controller-token"
    @headers = { "Authorization" => "Bearer #{@token}", "Idempotency-Key" => "controller-complete-001" }
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Completion device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
    @task = TaskTemplate.create!(user: @user, title: "실제 지원", points: 25, target_count: 1, position: 0, kind: "application")
  end

  test "rejects an application completion without a note" do
    post "/api/v1/task_templates/#{@task.id}/completions", params: {}, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "note_required", response.parsed_body.dig("error", "code")
    assert_equal 0, DailyTaskCompletion.count
    assert_equal 0, PointEvent.effective.sum(:points)
  end

  test "stores the note and awards points on success" do
    post "/api/v1/task_templates/#{@task.id}/completions", params: { note: "우아한형제들" }, headers: @headers, as: :json

    assert_response :created
    assert_equal "우아한형제들", response.parsed_body.dig("data", "completion", "note")
    # 유일한 할 일을 다 채우면 일일 보너스가 붙으므로 할 일 점수만 확인한다.
    task_points = PointEvent.effective.where(event_type: "task_completion").sum(:points)
    assert_equal 25, task_points
  end

  test "verifies a company picked from the registry" do
    company = Company.create!(name: "네이버", source: "seed")

    post "/api/v1/task_templates/#{@task.id}/completions",
      params: { note: "네이버", company_id: company.id }, headers: @headers, as: :json

    assert_response :created
    completion = response.parsed_body.dig("data", "completion")
    assert_equal "네이버", completion.fetch("note")
    assert completion.fetch("note_verified")
  end
end
