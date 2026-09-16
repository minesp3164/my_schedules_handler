require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false
  config.force_ssl = true
  config.hosts << ENV["APP_HOST"] if ENV["APP_HOST"].present?
  config.action_cable.allowed_request_origins = (
    [ "https://#{ENV['APP_HOST']}" ] + ENV["WEB_ORIGIN"].to_s.split(",")
  ).map(&:strip).reject { |origin| origin == "https://" || origin.empty? }
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")
  config.active_job.queue_adapter = :solid_queue
  config.solid_queue.connects_to = { database: { writing: :queue } }
end
