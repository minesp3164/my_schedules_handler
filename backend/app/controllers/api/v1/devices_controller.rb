module Api
  module V1
    class DevicesController < ApplicationController
      rescue_from ActiveRecord::RecordInvalid, with: :render_record_invalid
      rescue_from Devices::Activate::InvalidAccessKey, with: :render_invalid_access_key

      def activate
        result = Devices::Activate.call(**activation_params)
        render json: {
          data: {
            device: result.device.slice(:id, :installation_id, :name, :platform, :last_seen_at),
            access_token: result.access_token
          }
        }, status: :created
      end

      private

      def activation_params
        params.require(:device).permit(:installation_id, :name, :platform, :access_key).to_h.symbolize_keys
      end

      def render_invalid_access_key
        render json: { error: { code: "invalid_access_key", message: "개인 접속 키가 올바르지 않아요." } }, status: :unauthorized
      end

      def render_record_invalid(error)
        render json: { error: { code: "validation_failed", message: error.record.errors.full_messages.to_sentence } }, status: :unprocessable_entity
      end
    end
  end
end
