require "test_helper"
require "digest"

class Api::V1::CompaniesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @token = "companies-test-token"
    @headers = { "Authorization" => "Bearer #{@token}" }
    Device.create!(
      user: User.create!,
      installation_id: SecureRandom.uuid,
      name: "Companies device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest(@token)
    )
    Company.create!(name: "삼성전자", source: "seed")
    Company.create!(name: "주식회사 카카오", source: "seed")
    Company.create!(name: "네이버", source: "seed")
  end

  test "returns prefix matches even when the query has legal form words" do
    get "/api/v1/companies/search?q=#{CGI.escape("삼성전자(주)")}", headers: @headers

    assert_response :success
    names = response.parsed_body.fetch("data").map { |company| company.fetch("name") }
    assert_includes names, "삼성전자"
  end

  test "falls back to contains matches" do
    get "/api/v1/companies/search?q=#{CGI.escape("카카")}", headers: @headers

    assert_response :success
    names = response.parsed_body.fetch("data").map { |company| company.fetch("name") }
    assert_includes names, "주식회사 카카오"
  end

  test "returns nothing for a blank query" do
    get "/api/v1/companies/search?q=", headers: @headers

    assert_response :success
    assert_empty response.parsed_body.fetch("data")
  end

  test "requires a device token" do
    get "/api/v1/companies/search?q=#{CGI.escape("삼성")}"

    assert_response :unauthorized
  end
end
