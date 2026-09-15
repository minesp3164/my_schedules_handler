module Api
  module V1
    class MilestonesController < BaseController
      def show
        result = Milestones::Progress.call(user: current_user)

        render json: {
          data: {
            activity_days: result.activity_days,
            focus_minutes: result.focus_minutes,
            completed_tasks: result.completed_tasks,
            created_tasks: result.created_tasks
          }
        }
      end
    end
  end
end
