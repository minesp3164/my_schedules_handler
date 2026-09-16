class Rack::Attack
  safelist_ip("127.0.0.1")
  safelist_ip("::1")

  throttle("api/devices/activate", limit: 5, period: 1.minute) do |request|
    request.ip if request.post? && request.path == "/api/v1/devices/activate"
  end

  throttle("api/devices/activate/global", limit: 20, period: 1.hour) do |request|
    "global" if request.post? && request.path == "/api/v1/devices/activate"
  end

  throttle("api/notifications/test-nudge", limit: 10, period: 1.minute) do |request|
    request.ip if request.post? && request.path == "/api/v1/notifications/test-nudge"
  end

  throttle("api/ip", limit: 300, period: 5.minutes) do |request|
    request.ip if request.path.start_with?("/api/", "/cable")
  end

  self.throttled_responder = lambda do |request|
    match = request.env["rack.attack.match_data"] || {}
    period = match[:period]
    retry_after = period ? period - (Time.now.to_i % period) : 60
    body = { error: { code: "rate_limited", message: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." } }

    [
      429,
      { "content-type" => "application/json", "retry-after" => retry_after.to_s },
      [body.to_json]
    ]
  end
end
