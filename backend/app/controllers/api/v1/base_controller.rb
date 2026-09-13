require "digest"

module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_device!

      rescue_from ActiveRecord::RecordInvalid, with: :render_record_invalid
      rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
      rescue_from Tasks::Complete::TargetAlreadyMet, with: :render_target_already_met
      rescue_from Tasks::Complete::InactiveTask, with: :render_inactive_task

      private

      attr_reader :current_device

      delegate :user, to: :current_device, prefix: :current

      def authenticate_device!
        token = request.authorization.to_s.delete_prefix("Bearer ").presence
        digest = Digest::SHA256.hexdigest(token.to_s)
        @current_device = Device.active.find_by(access_token_digest: digest)
        return if @current_device

        render json: { error: { code: "unauthorized", message: "유효한 기기 토큰이 필요해요." } }, status: :unauthorized
      ensure
        @current_device&.update_column(:last_seen_at, Time.current)
      end

      def render_record_invalid(error)
        render json: { error: { code: "validation_failed", message: error.record.errors.full_messages.to_sentence } }, status: :unprocessable_entity
      end

      def render_not_found
        render json: { error: { code: "not_found", message: "요청한 데이터를 찾을 수 없어요." } }, status: :not_found
      end

      def render_target_already_met
        render json: { error: { code: "target_already_met", message: "오늘 목표 횟수를 이미 채웠어요." } }, status: :conflict
      end

      def render_inactive_task
        render json: { error: { code: "inactive_task", message: "비활성화된 할 일은 완료할 수 없어요." } }, status: :unprocessable_entity
      end
    end
  end
end
