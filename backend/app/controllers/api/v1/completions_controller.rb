module Api
  module V1
    class CompletionsController < BaseController
      def destroy
        completion, summary, changed = Tasks::Revert.call(completion_id: params[:id])
        # 완료 취소로 지표가 내려가면 배지도 바로 회수한다.
        Badges::Evaluate.call(user: current_user) if changed
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
