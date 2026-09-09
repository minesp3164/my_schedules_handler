module Api
  module V1
    class TaskTemplatesController < BaseController
      def index
        tasks = TaskTemplate.active_in_order
        render json: { data: tasks.map { |task| task_payload(task) } }
      end

      def create
        task = TaskTemplate.create!(task_params)
        render json: { data: task_payload(task) }, status: :created
      end

      def update
        task = TaskTemplate.find(params[:id])
        task.update!(task_params)
        render json: { data: task_payload(task) }
      end

      def destroy
        task = TaskTemplate.find(params[:id])
        task.update!(active: false)
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
