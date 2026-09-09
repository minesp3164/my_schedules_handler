module Api
  module V1
    class PushSubscriptionsController < BaseController
      class InvalidSubscription < StandardError; end
      rescue_from InvalidSubscription, with: :render_invalid_subscription

      def create
        attributes = subscription_params
        validate_subscription!(attributes)
        current_device.update!(attributes)
        render json: { data: { device_id: current_device.id, push_channel: current_device.push_channel } }
      end

      private

      def subscription_params
        permitted = params.require(:push_subscription).permit(:expo_push_token, web_push_subscription: [ :endpoint, { keys: %i[p256dh auth] } ])
        attributes = permitted.to_h.symbolize_keys
        attributes[:web_push_subscription] = attributes[:web_push_subscription].to_json if attributes[:web_push_subscription]
        attributes
      end

      def validate_subscription!(attributes)
        return if attributes[:expo_push_token].present?

        subscription = JSON.parse(attributes[:web_push_subscription].to_s)
        valid = subscription.dig("keys", "p256dh").present? && subscription.dig("keys", "auth").present?
        valid &&= Notifications::WebPushEndpoint.valid?(subscription["endpoint"].to_s)
        raise InvalidSubscription unless valid
      rescue JSON::ParserError
        raise InvalidSubscription
      end

      def render_invalid_subscription
        render json: { error: { code: "invalid_push_subscription", message: "Expo 토큰 또는 유효한 Web Push 구독 정보가 필요해요." } }, status: :unprocessable_entity
      end
    end
  end
end
