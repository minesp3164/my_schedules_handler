module Api
  module V1
    class RewardRedemptionsController < BaseController
      rescue_from Rewards::Redeem::InsufficientPoints, with: :render_insufficient_points
      rescue_from Rewards::Redeem::UnknownReward, with: :render_unknown_reward

      def create
        result = Rewards::Redeem.call(user: current_user, source_device: current_device, reward_kind: params.require(:reward_kind), idempotency_key: request.headers['Idempotency-Key'])
        render json: { data: result.redemption.slice(:id, :reward_kind, :cost_points, :redeemed_at).merge(remaining_points: result.remaining_points, replayed: result.replayed) }
      end

      private

      def render_insufficient_points
        render json: { error: { code: 'insufficient_points', message: '보유 포인트가 부족해요.' } }, status: :conflict
      end

      def render_unknown_reward
        render json: { error: { code: 'unknown_reward', message: '선택할 수 없는 보상이에요.' } }, status: :unprocessable_entity
      end
    end
  end
end
