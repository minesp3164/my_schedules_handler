require "test_helper"

class Api::V1::RealtimeTicketsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @result = Devices::Activate.call(
      installation_id: SecureRandom.uuid, name: "Mina's iPhone", platform: "ios"
    )
  end

  test "issues a ticket usable for cable authentication" do
    post "/api/v1/realtime-tickets", headers: { "Authorization" => "Bearer #{@result.access_token}" }, as: :json

    assert_response :created
    ticket = response.parsed_body.dig("data", "ticket")
    assert_equal @result.device.id, Realtime::Ticket.device_for(ticket)&.id
  end

  test "requires a device token" do
    post "/api/v1/realtime-tickets", as: :json

    assert_response :unauthorized
  end
end
