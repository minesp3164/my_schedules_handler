class SendDailyNudgeJob < ApplicationJob
  queue_as :notifications

  def perform
    Notifications::DailyNudge.call
  end
end
