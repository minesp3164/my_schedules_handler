module Api
  module V1
    class TaskTemplatesController < BaseController
      DEFAULT_POINTS = { "focus" => 10, "algorithm" => 15, "portfolio" => 20, "application" => 25 }.freeze
      def index
        tasks = current_user.task_templates.active_in_order
        render json: { data: tasks.map { |task| task_payload(task) } }
      end

      def create
        attributes = task_params.to_h.symbolize_keys
        task = current_user.task_templates.create!(
          attributes.merge(points: points_for(attributes[:kind], attributes[:target_count]))
        )
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
        params.require(:task_template).permit(:title, :target_count, :position, :kind, :active, weekdays: [])
      end

      def points_for(kind, target_count)
        base_points = DEFAULT_POINTS.fetch(kind.to_s, 10)
        return base_points if %w[portfolio application].include?(kind.to_s)

        base_points * [target_count.to_i, 1].max
      end

      def task_payload(task)
        task.slice(:id, :title, :points, :target_count, :position, :kind, :active).merge(weekdays: task.weekdays)
      end
    end
  end
end
