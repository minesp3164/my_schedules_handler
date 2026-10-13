require "test_helper"
require "digest"

class Api::V1::StageEventsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!
    Setting.instance
    @token = "stage-events-token"
    @headers = { "Authorization" => "Bearer #{@token}", "Idempotency-Key" => "stage-event-001" }
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Stage event device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
    @stages = Applications::SyncDefaultStages.call(user: @user).index_by(&:kind)
    @application = @user.applications.create!(company: "네이버")
    @task = TaskTemplate.create!(user: @user, title: "실제 지원", points: 25, target_count: 1, position: 0, kind: "application")
    # 일일 보너스가 포인트 검증에 섞이지 않도록 목표를 하나 더 둔다.
    TaskTemplate.create!(user: @user, title: "이력서 개선", points: 20, target_count: 1, position: 1, kind: "portfolio")
  end

  test "recording a submission stage returns points and refreshes the application" do
    post "/api/v1/applications/#{@application.id}/stage-events",
      params: { stage_event: { application_stage_id: @stages["submission"].id } },
      headers: @headers, as: :json

    assert_response :created
    data = response.parsed_body.fetch("data")
    assert_equal "submission", data.dig("stage_event", "kind")
    assert_equal 25, data.dig("stage_event", "points")
    assert_equal 25, data.dig("daily_summary", "points_total")
    assert_equal 1, data.fetch("point_events").size
    assert_equal 1, data.dig("application", "stages").size
  end

  test "recording the same stage twice conflicts" do
    post "/api/v1/applications/#{@application.id}/stage-events",
      params: { stage_event: { application_stage_id: @stages["interview"].id } },
      headers: @headers, as: :json

    retry_headers = @headers.merge("Idempotency-Key" => "stage-event-002")
    post "/api/v1/applications/#{@application.id}/stage-events",
      params: { stage_event: { application_stage_id: @stages["interview"].id } },
      headers: retry_headers, as: :json

    assert_response :conflict
    assert_equal "stage_already_recorded", response.parsed_body.dig("error", "code")
  end

  test "replaying the same idempotency key returns ok without new points" do
    2.times do
      post "/api/v1/applications/#{@application.id}/stage-events",
        params: { stage_event: { application_stage_id: @stages["pass"].id } },
        headers: @headers, as: :json
    end

    assert_response :ok
    assert_equal 1, ApplicationStageEvent.count
    assert_equal 100, PointEvent.effective.sum(:points)
  end

  test "another user cannot record onto a foreign application" do
    other_user = User.create!

    assert_raises(ActiveRecord::RecordNotFound) do
      Applications::RecordStage.call(
        application_id: @application.id,
        application_stage_id: @stages["submission"].id,
        source_device: Device.create!(
          user: other_user,
          installation_id: SecureRandom.uuid,
          name: "Other",
          platform: "web",
          access_token_digest: Digest::SHA256.hexdigest("other")
        ),
        idempotency_key: "foreign-record"
      )
    end
  end

  test "destroying a stage event reverts points and daily summary" do
    post "/api/v1/applications/#{@application.id}/stage-events",
      params: { stage_event: { application_stage_id: @stages["submission"].id } },
      headers: @headers, as: :json
    stage_event_id = response.parsed_body.dig("data", "stage_event", "id")

    delete "/api/v1/stage-events/#{stage_event_id}", headers: @headers

    assert_response :success
    assert_equal 0, PointEvent.effective.sum(:points)
    assert_equal 0, DailySummary.find_by(date: Time.zone.today).points_total
    assert_not_nil response.parsed_body.dig("data", "stage_event", "reverted_at")
  end

  test "destroying a foreign stage event is not found" do
    other_user = User.create!

    assert_raises(ActiveRecord::RecordNotFound) do
      Applications::RevertStage.call(stage_event_id: "no-such-event", user: other_user)
    end
  end
end
