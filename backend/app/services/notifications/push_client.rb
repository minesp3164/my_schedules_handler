require "json"
require "net/http"

module Notifications
  class PushClient
    class DeliveryError < StandardError; end

    def deliver(device:, title:, body:, data: {}, silent: false)
      case device.push_channel
      when "expo" then deliver_expo(device.expo_push_token, title, body, data, silent: silent)
      when "web_push" then deliver_web_push(device.web_push_subscription_payload, title, body, data)
      else raise DeliveryError, "푸시 구독 정보가 없어요."
      end
    end

    private

    def deliver_expo(token, title, body, data, silent: false)
      request = Net::HTTP::Post.new("/--/api/v2/push/send", { "Content-Type" => "application/json" })
      request["Authorization"] = "Bearer #{ENV.fetch("EXPO_ACCESS_TOKEN")}" if ENV["EXPO_ACCESS_TOKEN"].present?
      payload = { to: token, data: data }
      if silent
        payload[:_contentAvailable] = true
      else
        payload[:title] = title
        payload[:body] = body
      end
      request.body = payload.to_json
      response = Net::HTTP.start("exp.host", 443, use_ssl: true, open_timeout: 5, read_timeout: 5) { |http| http.request(request) }
      raise DeliveryError, "Expo Push 응답 #{response.code}" unless response.is_a?(Net::HTTPSuccess)
    rescue SocketError, Timeout::Error, Net::OpenTimeout, Net::ReadTimeout => error
      raise DeliveryError, error.message
    end

    def deliver_web_push(subscription, title, body, data)
      raise DeliveryError, "Web Push 구독 정보가 없어요." unless subscription

      Webpush.payload_send(
        message: { title: title, body: body, data: data }.to_json,
        endpoint: subscription.fetch("endpoint"),
        p256dh: subscription.dig("keys", "p256dh"),
        auth: subscription.dig("keys", "auth"),
        vapid: {
          subject: ENV.fetch("VAPID_SUBJECT"),
          public_key: ENV.fetch("VAPID_PUBLIC_KEY"),
          private_key: ENV.fetch("VAPID_PRIVATE_KEY")
        },
        open_timeout: 5,
        read_timeout: 5
      )
    rescue KeyError, Webpush::ResponseError => error
      raise DeliveryError, error.message
    end
  end
end
