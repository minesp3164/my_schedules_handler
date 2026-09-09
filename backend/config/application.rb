require_relative "boot"

require "rails/all"

Bundler.require(*Rails.groups)

module RewardTrackerBackend
  class Application < Rails::Application
    config.load_defaults 8.1
    config.api_only = true
    config.time_zone = "Asia/Seoul"
    config.active_record.default_timezone = :utc
    config.generators.system_tests = nil
  end
end
