require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.eager_load = false
  config.enable_reloading = true
  config.consider_all_requests_local = true
  config.server_timing = true
  config.log_level = :debug
  # ngrok를 통한 외부 기기 테스트 요청을 개발 환경에서 허용합니다.
  config.hosts << "rearrange-squash-spiny.ngrok-free.dev"
end
