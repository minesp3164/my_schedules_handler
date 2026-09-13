require "date"

module Api
  module V1
    class HistoriesController < BaseController
      rescue_from ArgumentError, with: :render_invalid_date
      rescue_from History::List::InvalidRange, with: :render_invalid_range

      def index
        result = History::List.call(from: requested_date(:from), to: requested_date(:to), user: current_user)
        render json: {
          data: {
            from: result.from,
            to: result.to,
            days: result.days
          },
          meta: { revision: Realtime::Publish.current_revision, server_time: Time.current }
        }
      end

      private

      def requested_date(key)
        Date.iso8601(params.require(key))
      end

      def render_invalid_date
        render json: { error: { code: "invalid_date", message: "from과 to는 YYYY-MM-DD 형식이어야 해요." } }, status: :unprocessable_entity
      end

      def render_invalid_range
        render json: { error: { code: "invalid_history_range", message: "조회 기간은 최대 31일이며 시작일이 종료일보다 앞서야 해요." } }, status: :unprocessable_entity
      end
    end
  end
end
