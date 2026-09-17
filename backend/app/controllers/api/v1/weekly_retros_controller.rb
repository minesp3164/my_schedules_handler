require "date"

module Api
  module V1
    class WeeklyRetrosController < BaseController
      rescue_from ArgumentError, with: :render_invalid_date
      rescue_from Rewards::Redeem::InsufficientPoints, with: :render_insufficient_points

      def show
        render json: { data: payload(retro), meta: meta }
      end

      def update
        record = retro
        if body_param.present?
          WeeklyRetro.transaction do
            record ||= create_with_redemption
            record.update!(body: body_param)
          end
        else
          record&.destroy!
          record = nil
        end
        revision = Realtime::Publish.call(event: "retro.saved", data: { week_start: week_start.iso8601 }).revision
        render json: { data: payload(record), meta: meta(revision) }
      end

      private

      def retro
        @retro ||= current_user.weekly_retros.find_by(week_start: week_start)
      end

      def week_start
        @week_start ||= Date.iso8601(params.require(:week_start)).beginning_of_week
      end

      def body_param
        params.permit(:body)[:body]
      end

      def payload(record)
        {
          week_start: week_start.iso8601,
          body: record&.body,
          updated_at: record&.updated_at&.iso8601
        }
      end

      def meta(revision = Realtime::Publish.current_revision)
        { revision: revision, server_time: Time.current }
      end

      def create_with_redemption
        Rewards::Redeem.call(
          user: current_user,
          source_device: current_device,
          reward_kind: "reflection",
          idempotency_key: "weekly-retro:#{week_start.iso8601}"
        )
        current_user.weekly_retros.build(week_start: week_start)
      end

      def render_invalid_date
        render json: { error: { code: "invalid_date", message: "week_start는 YYYY-MM-DD 형식이어야 해요." } }, status: :unprocessable_entity
      end

      def render_insufficient_points
        render json: { error: { code: "insufficient_points", message: "회고를 남기려면 300점이 필요해요." } }, status: :conflict
      end
    end
  end
end
