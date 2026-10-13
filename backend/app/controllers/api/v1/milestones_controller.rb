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
            created_tasks: result.created_tasks,
            application_completions: result.application_completions,
            algorithm_completions: result.algorithm_completions,
            portfolio_completions: result.portfolio_completions,
            first_activity_date: result.first_activity_date
          }
        }
      end
    end
  end
end
