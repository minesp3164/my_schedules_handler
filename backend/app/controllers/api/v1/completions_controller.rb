module Api
  module V1
    class CompletionsController < BaseController
      def destroy
        completion, summary, changed = Tasks::Revert.call(completion_id: params[:id])
        revision = if changed
          Realtime::Publish.call(event: "task.reverted", data: { completion_id: completion.id, task_template_id: completion.task_template_id }).revision
        end
        render json: {
          data: {
            completion: completion.slice(:id, :reverted_at),
            daily_summary: summary.slice(:date, :points_total, :daily_bonus_awarded)
          },
          meta: { revision: revision || Realtime::Publish.current_revision, server_time: Time.current }
        }
      end
    end
  end
end
