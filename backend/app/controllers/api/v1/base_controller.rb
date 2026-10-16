require "digest"

module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_device!

      rescue_from ActiveRecord::RecordInvalid, with: :render_record_invalid
      rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
      rescue_from Tasks::Complete::TargetAlreadyMet, with: :render_target_already_met
      rescue_from Tasks::Complete::InactiveTask, with: :render_inactive_task
      rescue_from Tasks::Complete::StageRequired, with: :render_stage_required
      rescue_from Tasks::Revert::StageBackedCompletion, with: :render_stage_backed_completion
      rescue_from ::Applications::RecordStage::StageAlreadyRecorded, with: :render_stage_already_recorded
      rescue_from ::Applications::RecordStage::InactiveStage, with: :render_inactive_stage
      rescue_from ::Applications::RecordStage::ApplicationClosed, with: :render_application_closed

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

      def render_stage_required
        render json: {
          error: { code: "stage_required", message: "실제 지원은 지원 현황에서 단계를 기록하면 완료돼요." }
        }, status: :unprocessable_entity
      end

      def render_stage_backed_completion
        render json: {
          error: { code: "stage_backed_completion", message: "지원 기록으로 채워진 완료예요. 지원 현황에서 단계를 취소하면 함께 사라져요." }
        }, status: :conflict
      end

      def render_stage_already_recorded
        render json: { error: { code: "stage_already_recorded", message: "이미 기록된 단계예요. 갱신된 현황을 확인해 주세요." } }, status: :conflict
      end

      def render_inactive_stage
        render json: { error: { code: "inactive_stage", message: "비활성화된 단계는 기록할 수 없어요." } }, status: :unprocessable_entity
      end

      def render_application_closed
        render json: { error: { code: "application_closed", message: "이미 종결된 지원 건이에요." } }, status: :unprocessable_entity
      end
    end
  end
end
