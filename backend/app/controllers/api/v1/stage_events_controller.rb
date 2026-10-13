module Api
  module V1
    class StageEventsController < BaseController
      def destroy
        result = ::Applications::RevertStage.call(stage_event_id: params[:id], user: current_user)
        revision = if result.changed
          Realtime::Publish.call(
            event: "application.stage_reverted",
            data: { application_id: result.application.id, stage_event_id: result.stage_event.id }
          ).revision
        end

        render json: {
          data: {
            stage_event: result.stage_event.slice(:id, :reverted_at),
            daily_summary: result.daily_summary&.slice(:date, :points_total, :daily_bonus_awarded)
          },
          meta: { revision: revision || Realtime::Publish.current_revision, server_time: Time.current }
        }
      end
    end
  end
end
