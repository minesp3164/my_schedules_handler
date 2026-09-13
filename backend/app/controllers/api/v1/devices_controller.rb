module Api
  module V1
    class DevicesController < ApplicationController
      rescue_from ActiveRecord::RecordInvalid, with: :render_record_invalid

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
        params.require(:device).permit(:installation_id, :name, :platform).to_h.symbolize_keys
      end

      def render_record_invalid(error)
        render json: { error: { code: "validation_failed", message: error.record.errors.full_messages.to_sentence } }, status: :unprocessable_entity
      end
    end
  end
end
