module Notifications
  class Deliver
    Result = Data.define(:delivery, :sent, :duplicate)

    def self.call(...)
      new(...).call
    end

    def initialize(device:, notification_type:, schedule_key:, title:, body:, data: {}, silent: false, client: PushClient.new)
      @device, @notification_type, @schedule_key = device, notification_type, schedule_key
      @title, @body, @data, @silent, @client = title, body, data, silent, client
    end

    def call
      delivery = NotificationDelivery.create!(
        device: @device, notification_type: @notification_type, schedule_key: @schedule_key,
        channel: @device.push_channel, title: @title, body: @body
      )
      delivery.update!(attempted_at: Time.current)
      @client.deliver(device: @device, title: @title, body: @body, data: @data, silent: @silent)
      delivery.update!(status: "sent", sent_at: Time.current)
      Result.new(delivery, true, false)
    rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid
      existing = NotificationDelivery.find_by!(device: @device, notification_type: @notification_type, schedule_key: @schedule_key)
      Result.new(existing, existing.status == "sent", true)
    rescue PushClient::DeliveryError => error
      delivery.update!(status: "failed", failed_at: Time.current, error_message: error.message)
      Result.new(delivery, false, false)
    end
  end
end
