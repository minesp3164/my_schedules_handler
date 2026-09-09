module Notifications
  class DailyNudge
    TITLE = "오늘의 첫 기록"
    BODY = "아직 오늘의 첫 기록이 없어요. 5분 타이머부터 가볍게 시작해볼까요?"

    def self.call(...)
      new(...).call
    end

    def initialize(now: Time.current, client: PushClient.new)
      @now, @client = now, client
    end

    def call
      setting = Setting.instance
      local_now = @now.in_time_zone(Setting::TIMEZONE)
      return [] unless setting.nudge_enabled? && local_now.strftime("%H:%M") == setting.nudge_at

      date = local_now.to_date
      return [] if DailySummary.find_by(date: date)&.first_activity_at.present?

      Device.find_each.filter_map do |device|
        next unless device.push_channel

        Deliver.call(device: device, notification_type: "daily_nudge", schedule_key: date.to_s, title: TITLE, body: BODY, data: { date: date.to_s }, client: @client)
      end
    end
  end
end
