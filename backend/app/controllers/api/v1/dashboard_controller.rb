require "date"

module Api
  module V1
    class DashboardController < BaseController
      rescue_from ArgumentError, with: :render_invalid_date

      def show
        result = Dashboard::Show.call(date: requested_date, user: current_user)
        render json: {
          data: {
            date: result.date,
            daily_summary: summary_payload(result.daily_summary),
            tasks: result.tasks,
            focus_session: focus_session_payload(result.focus_session),
            rewards: {
              daily: result.rewards.daily,
              weekly: result.rewards.weekly
            }
          },
          meta: { revision: Realtime::Publish.current_revision, server_time: Time.current }
        }
      end

      private

      def requested_date
        return Time.zone.today if params[:date].blank?

        Date.iso8601(params[:date])
      end

      def summary_payload(summary)
        return { points_total: 0, first_activity_at: nil, all_goals_completed_at: nil, daily_bonus_awarded: false } unless summary

        summary.slice(:date, :points_total, :first_activity_at, :all_goals_completed_at, :daily_bonus_awarded)
      end

      def focus_session_payload(session)
        return nil unless session

        session.slice(:id, :source_device_id, :started_at, :planned_seconds, :status, :paused_at, :paused_seconds)
      end

      def render_invalid_date
        render json: { error: { code: "invalid_date", message: "날짜는 YYYY-MM-DD 형식이어야 해요." } }, status: :unprocessable_entity
      end
    end
  end
end
