require "test_helper"
require "digest"

class Api::V1::ApplicationStagesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!
    Setting.instance
    @token = "application-stages-token"
    @headers = { "Authorization" => "Bearer #{@token}" }
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Stage device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
  end

  test "index returns default stages on first use" do
    get "/api/v1/application-stages", headers: @headers

    assert_response :success
    stages = response.parsed_body.dig("data", "stages")
    assert_equal %w[submission interview pass], stages.map { |stage| stage.fetch("kind") }
    assert_equal ["이력서 제출", "면접", "합격"], stages.map { |stage| stage.fetch("name") }
  end

  test "create adds a custom stage with its kind fixed points" do
    post "/api/v1/application-stages",
      params: { application_stage: { name: "1차 면접", kind: "interview" } },
      headers: @headers, as: :json

    assert_response :created
    stage = response.parsed_body.dig("data", "stage")
    assert_equal "1차 면접", stage.fetch("name")
    assert_equal 30, stage.fetch("points")
    assert_equal 3, stage.fetch("position")
  end

  test "create rejects an unknown kind" do
    post "/api/v1/application-stages",
      params: { application_stage: { name: "최종", kind: "final" } },
      headers: @headers, as: :json

    assert_response :unprocessable_entity
  end

  test "update renames a stage" do
    stage = Applications::SyncDefaultStages.call(user: @user).find_by(kind: "interview")

    patch "/api/v1/application-stages/#{stage.id}",
      params: { application_stage: { name: "1차 면접" } }, headers: @headers, as: :json

    assert_response :success
    assert_equal "1차 면접", stage.reload.name
  end

  test "destroy deactivates a stage instead of deleting history" do
    stage = Applications::SyncDefaultStages.call(user: @user).find_by(kind: "interview")

    delete "/api/v1/application-stages/#{stage.id}", headers: @headers

    assert_response :success
    assert_not stage.reload.active
    assert ApplicationStage.exists?(stage.id)
  end

  test "destroy rejects removing the last active stage" do
    Applications::SyncDefaultStages.call(user: @user).find_by(kind: "interview").update!(active: false)
    submission = Applications::SyncDefaultStages.call(user: @user).find_by(kind: "submission")
    pass = ApplicationStage.find_by(user: @user, kind: "pass")
    pass.update!(active: false)

    delete "/api/v1/application-stages/#{submission.id}", headers: @headers

    assert_response :unprocessable_entity
    assert_equal "last_active_stage", response.parsed_body.dig("error", "code")
  end
end
