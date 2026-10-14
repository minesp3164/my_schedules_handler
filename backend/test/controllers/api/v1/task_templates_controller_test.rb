require "test_helper"
require "digest"

class Api::V1::TaskTemplatesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!
    @token = "task-templates-token"
    @headers = { "Authorization" => "Bearer #{@token}" }
    Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Task template device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
  end

  test "a research task pays 10 points per daily target" do
    post "/api/v1/task_templates",
      params: { task_template: { title: "기업 리서치", target_count: 3, kind: "research", weekdays: [1, 2, 3, 4, 5] } },
      headers: @headers, as: :json

    assert_response :created
    assert_equal "research", response.parsed_body.dig("data", "kind")
    assert_equal 30, response.parsed_body.dig("data", "points")
  end

  test "an application task keeps its fixed 25 points regardless of the target" do
    post "/api/v1/task_templates",
      params: { task_template: { title: "이력서 지원", target_count: 3, kind: "application", weekdays: [1, 2, 3, 4, 5] } },
      headers: @headers, as: :json

    assert_response :created
    assert_equal 25, response.parsed_body.dig("data", "points")
  end

  test "a research task created twice merges into one with proportional points" do
    params = { task_template: { title: "기업 리서치", target_count: 2, kind: "research", weekdays: [1] } }

    post "/api/v1/task_templates", params: params, headers: @headers, as: :json
    post "/api/v1/task_templates", params: params, headers: @headers, as: :json

    assert_equal true, response.parsed_body.dig("meta", "merged")
    task = TaskTemplate.find_by(user: @user, title: "기업 리서치")
    assert_equal 4, task.target_count
    assert_equal 40, task.points
  end
end
