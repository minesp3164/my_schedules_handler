require "test_helper"

class Notifications::WebPushEndpointTest < ActiveSupport::TestCase
  test "accepts an HTTPS endpoint resolving only to public addresses" do
    resolver = ->(_host) { ["142.250.72.14", "2607:f8b0:4004:c1b::8a"] }

    assert Notifications::WebPushEndpoint.valid?("https://fcm.googleapis.com/fcm/send/example", resolver: resolver)
  end

  test "rejects insecure, malformed, and alternate-port endpoints" do
    resolver = ->(_host) { ["142.250.72.14"] }

    assert_not Notifications::WebPushEndpoint.valid?("http://fcm.googleapis.com/send", resolver: resolver)
    assert_not Notifications::WebPushEndpoint.valid?("https://user@fcm.googleapis.com/send", resolver: resolver)
    assert_not Notifications::WebPushEndpoint.valid?("https://fcm.googleapis.com:8443/send", resolver: resolver)
  end

  test "rejects loopback and private DNS results" do
    assert_not Notifications::WebPushEndpoint.valid?("https://push.example.test/send", resolver: ->(_host) { ["127.0.0.1"] })
    assert_not Notifications::WebPushEndpoint.valid?("https://push.example.test/send", resolver: ->(_host) { ["10.0.0.4"] })
    assert_not Notifications::WebPushEndpoint.valid?("https://push.example.test/send", resolver: ->(_host) { ["fc00::1"] })
  end
end
