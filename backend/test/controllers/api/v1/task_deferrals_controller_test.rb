require "test_helper"
require "digest"

class Api::V1::TaskDeferralsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @token = "deferral-ctrl-token"
    @headers = { "Authorization" => "Bearer #{@token}" }
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Deferral controller",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
    @task = TaskTemplate.create!(
      user: @user, title: "알고리즘", points: 15, target_count: 1, position: 0, kind: "algorithm"
    )
    Setting.instance
  end

  test "deferring requires a device token" do
    post "/api/v1/task-deferrals", params: { task_template_id: @task.id }, as: :json

    assert_response :unauthorized
  end

  test "defer spends the recovery pass and undo restores it" do
    grant_pass!

    post "/api/v1/task-deferrals",
      params: { task_template_id: @task.id },
      headers: @headers.merge("Idempotency-Key" => "defer-1"), as: :json

    assert_response :created
    deferral = response.parsed_body.dig("data", "deferral")
    assert_equal Date.current.iso8601, deferral.fetch("from_date")
    assert_equal (Date.current + 1).iso8601, deferral.fetch("to_date")
    assert_equal "redeemed", response.parsed_body.dig("data", "redemption", "status")

    post "/api/v1/task-deferrals",
      params: { task_template_id: @task.id },
      headers: @headers.merge("Idempotency-Key" => "defer-2"), as: :json

    assert_response :ok, "같은 날 같은 할 일은 재생성되지 않는다"
    assert_equal deferral.fetch("id"), response.parsed_body.dig("data", "deferral", "id")

    delete "/api/v1/task-deferrals/#{deferral.fetch('id')}", headers: @headers

    assert_response :success
    assert_equal "unlocked", response.parsed_body.dig("data", "redemption", "status")
    assert_equal 0, TaskDeferral.count
  end

  test "returns recovery_required without an unlocked pass" do
    post "/api/v1/task-deferrals",
      params: { task_template_id: @task.id },
      headers: @headers.merge("Idempotency-Key" => "defer-none"), as: :json

    assert_response :conflict
    assert_equal "recovery_required", response.parsed_body.dig("error", "code")
  end

  test "rejects a completed task" do
    grant_pass!
    @task.daily_task_completions.create!(
      source_device: @device, completed_on: Date.current, sequence: 1, completed_at: Time.current
    )

    post "/api/v1/task-deferrals",
      params: { task_template_id: @task.id },
      headers: @headers.merge("Idempotency-Key" => "defer-done"), as: :json

    assert_response :unprocessable_entity
    assert_equal "deferral_not_allowed", response.parsed_body.dig("error", "code")
  end

  test "undo rejects another user's deferral" do
    other_user = User.create!
    other_task = TaskTemplate.create!(
      user: other_user, title: "다른 사람 할 일", points: 10, target_count: 1,
      position: 0, kind: "custom"
    )
    past = TaskDeferral.create!(user: other_user, task_template: other_task,
      from_date: Date.current - 1, to_date: Date.current)

    delete "/api/v1/task-deferrals/#{past.id}", headers: @headers

    assert_response :not_found
  end

  test "undo rejects a deferral from a past day" do
    past = TaskDeferral.create!(user: @user, task_template: @task,
      from_date: Date.current - 1, to_date: Date.current)

    delete "/api/v1/task-deferrals/#{past.id}", headers: @headers

    assert_response :unprocessable_entity
    assert_equal "not_undoable", response.parsed_body.dig("error", "code")
    assert TaskDeferral.exists?(past.id)
  end

  private

  def grant_pass!
    @user.reward_redemptions.create!(
      reward_kind: "recovery", status: "unlocked", unlocked_at: Time.current
    )
  end
end
