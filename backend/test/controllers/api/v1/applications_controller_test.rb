require "test_helper"
require "digest"

class Api::V1::ApplicationsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!
    Setting.instance
    @token = "applications-controller-token"
    @headers = { "Authorization" => "Bearer #{@token}" }
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Application device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
  end

  test "index seeds default stages and lists applications" do
    @user.applications.create!(company: "네이버")

    get "/api/v1/applications", headers: @headers

    assert_response :success
    data = response.parsed_body.fetch("data")
    assert_equal ["네이버"], data.fetch("applications").map { |application| application.fetch("company") }
    assert_equal %w[submission interview pass], data.fetch("stages").map { |stage| stage.fetch("kind") }
    assert_equal [25, 30, 100], data.fetch("stages").map { |stage| stage.fetch("points") }
  end

  test "create stores the application and uses the canonical company name" do
    company = Company.create!(name: "네이버", source: "seed")

    post "/api/v1/applications",
      params: { application: { company: "네이버(주)", company_id: company.id, title: "백엔드 개발" } },
      headers: @headers, as: :json

    assert_response :created
    application = response.parsed_body.dig("data", "application")
    assert_equal "네이버", application.fetch("company")
    assert_equal "백엔드 개발", application.fetch("title")
    assert_equal "active", application.fetch("status")
  end

  test "create rejects a blank company" do
    post "/api/v1/applications", params: { application: { company: "  " } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "validation_failed", response.parsed_body.dig("error", "code")
  end

  test "create rejects a second active application for the same company" do
    @user.applications.create!(company: "네이버")

    post "/api/v1/applications", params: { application: { company: "네이버(주)" } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "이미 진행 중인 지원 건이 있어요. 재지원은 종결 후에 기록할 수 있어요.",
      response.parsed_body.dig("error", "message")
  end

  test "create allows reapplying after the previous application was closed" do
    @user.applications.create!(company: "네이버", status: "rejected", closed_at: Time.current)

    post "/api/v1/applications", params: { application: { company: "네이버" } }, headers: @headers, as: :json

    assert_response :created
  end

  test "update closes an active application" do
    application = @user.applications.create!(company: "카카오")

    patch "/api/v1/applications/#{application.id}",
      params: { application: { status: "rejected" } }, headers: @headers, as: :json

    assert_response :success
    assert_equal "rejected", response.parsed_body.dig("data", "application", "status")
    assert_not_nil application.reload.closed_at
  end

  test "update rejects a non-closable status" do
    application = @user.applications.create!(company: "카카오")

    patch "/api/v1/applications/#{application.id}",
      params: { application: { status: "accepted" } }, headers: @headers, as: :json

    assert_response :unprocessable_entity
    assert_equal "invalid_status", response.parsed_body.dig("error", "code")
    assert_equal "active", application.reload.status
  end

  test "update leaves an accepted application untouched" do
    application = @user.applications.create!(company: "카카오", status: "accepted")

    patch "/api/v1/applications/#{application.id}",
      params: { application: { status: "withdrawn" } }, headers: @headers, as: :json

    assert_response :success
    assert_equal "accepted", application.reload.status
  end
end
