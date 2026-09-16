Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(
      "http://localhost:8081",
      "http://192.168.200.104:8081",
      *ENV["WEB_ORIGIN"].to_s.split(",").map(&:strip).reject(&:empty?)
    )
    resource "/api/*", headers: :any, methods: %i[get post patch put delete options]
  end
end
