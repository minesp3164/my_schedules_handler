module Api
  module V1
    class TaskTemplatesController < BaseController
      def index
        tasks = current_user.task_templates.active_in_order
        render json: { data: tasks.map { |task| task_payload(task) } }
      end

      def create
        task = current_user.task_templates.create!(task_params)
        render json: { data: task_payload(task) }, status: :created
      end

      def update
        task = current_user.task_templates.find(params[:id])
        task.update!(task_params)
        render json: { data: task_payload(task) }
      end

      def destroy
        result = Tasks::Deactivate.call(task_template_id: params[:id], user: current_user)
        if result.changed
          Realtime::Publish.call(
            event: "task.deactivated",
            data: { task_template_id: result.task.id, reverted_completion_count: result.summaries.size }
          )
        end
        head :no_content
      end

      private

      def task_params
        params.require(:task_template).permit(:title, :points, :target_count, :position, :kind, :active)
      end

      def task_payload(task)
        task.slice(:id, :title, :points, :target_count, :position, :kind, :active)
      end
    end
  end
end
