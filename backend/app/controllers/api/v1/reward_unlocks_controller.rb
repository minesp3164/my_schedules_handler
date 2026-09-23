module Api
  module V1
    class RewardUnlocksController < BaseController
      def index
        result = Rewards::Unlocks.call(user: current_user, date: Date.current)
        render json: {
          data: {
            total_points: result.total_points,
            earned_points: result.earned_points,
            weekly_points: result.weekly_points,
            unlocks: result.unlocks.map { |state| state_payload(state) }
          }
        }
      end

      private

      def state_payload(state)
        state.except(:record).merge(record: state[:record] && record_payload(state[:record]))
      end

      def record_payload(record)
        record.slice(:id, :reward_kind, :status, :period_key, :unlocked_at, :redeemed_at, :payload)
      end
    end
  end
end
