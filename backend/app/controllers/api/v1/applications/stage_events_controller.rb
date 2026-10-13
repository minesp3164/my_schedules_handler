module Api
  module V1
    module Applications
      class StageEventsController < BaseController
        include ::Api::V1::ApplicationPayload

        def create
          result = ::Applications::RecordStage.call(
            application_id: params[:application_id],
            application_stage_id: stage_params.require(:application_stage_id),
            source_device: current_device,
            idempotency_key: request.headers["Idempotency-Key"]
          )
          revision = unless result.replayed
            Realtime::Publish.call(
              event: "application.stage_completed",
              data: { application_id: result.application.id, stage_event_id: result.stage_event.id }
            ).revision
          end
          result.reward_achievements.each { |achievement| SendRewardNotificationJob.perform_later(achievement.id) }

          render json: {
            data: {
              application: application_payload(result.application),
              stage_event: stage_event_payload(result.stage_event),
              point_events: result.point_events.map { |event| milestone_event_payload(event) },
              daily_summary: result.daily_summary&.slice(:date, :points_total, :daily_bonus_awarded, :all_goals_completed_at),
              reward_achievements: result.reward_achievements.map { |achievement| reward_payload(achievement) }
            },
            meta: { revision: revision || Realtime::Publish.current_revision, server_time: Time.current }
          }, status: result.replayed ? :ok : :created
        end

        private

        def stage_params
          params.require(:stage_event).permit(:application_stage_id)
        end
      end
    end
  end
end
