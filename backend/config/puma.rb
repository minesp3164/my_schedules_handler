max_threads_count = ENV.fetch("RAILS_MAX_THREADS", 5)
threads max_threads_count, max_threads_count

port ENV.fetch("PORT", 3000)
environment ENV.fetch("RAILS_ENV", "development")

# 백그라운드 잡(FinalizeFocusSessionJob, SendDailyNudgeJob)을 puma 프로세스 안에서 실행한다.
plugin :solid_queue if ENV.fetch("SOLID_QUEUE_IN_PUMA", ENV["RAILS_ENV"] == "production" ? "true" : "false") == "true"
