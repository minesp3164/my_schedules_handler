module Api
  module V1
    class RewardRedemptionsController < BaseController
      rescue_from Rewards::Redeem::InsufficientPoints, with: :render_insufficient_points
      rescue_from Rewards::Redeem::UnknownReward, with: :render_unknown_reward
      rescue_from Rewards::Claim::Locked, with: :render_locked
      rescue_from Rewards::Claim::LimitReached, with: :render_limit_reached
      rescue_from Rewards::SetStatus::InvalidTransition, with: :render_invalid_transition

      def index
        records = current_user.reward_redemptions.order(created_at: :desc).map { |record| record_payload(record) }
        render json: { data: records }
      end

      def create
        result = Rewards::Claim.call(
          user: current_user,
          reward_kind: params.require(:reward_kind),
          idempotency_key: request.headers["Idempotency-Key"],
          payload: payload_params,
          source_device: current_device
        )
        render json: {
          data: record_payload(result.record).merge(remaining_points: result.balance, replayed: result.replayed)
        }, status: result.replayed ? :ok : :created
      end

      def update
        record = Rewards::SetStatus.call(user: current_user, id: params[:id], status: status_param)
        render json: { data: record_payload(record) }
      end

      private

      def status_param
        params.require(:status)
      end

      def payload_params
        payload = params[:payload]
        payload.is_a?(ActionController::Parameters) ? payload.to_unsafe_h : {}
      end

      def record_payload(record)
        record.slice(:id, :reward_kind, :status, :cost_points, :period_key, :unlocked_at, :redeemed_at, :payload)
      end

      def render_insufficient_points
        render json: { error: { code: "insufficient_points", message: "보유 포인트가 부족해요." } }, status: :conflict
      end

      def render_unknown_reward
        render json: { error: { code: "unknown_reward", message: "선택할 수 없는 보상이에요." } }, status: :unprocessable_entity
      end

      def render_locked
        render json: { error: { code: "reward_locked", message: "아직 열리지 않았어요. 포인트를 더 쌓으면 열려요." } }, status: :conflict
      end

      def render_limit_reached
        render json: { error: { code: "reward_limit", message: "이미 이번 기간에 기록한 보상이에요." } }, status: :conflict
      end

      def render_invalid_transition
        render json: { error: { code: "invalid_status", message: "지금은 이 상태로 바꿀 수 없어요." } }, status: :unprocessable_entity
      end
    end
  end
end
