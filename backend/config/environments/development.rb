require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.eager_load = false
  config.enable_reloading = true
  config.consider_all_requests_local = true
  config.server_timing = true
  config.log_level = :debug
end
