module Api
  module V1
    module TaskTemplates
      class CompletionsController < BaseController
        def create
          result = Tasks::Complete.call(
            task_template_id: params[:task_template_id],
            source_device: current_device,
            idempotency_key: request.headers["Idempotency-Key"]
          )
          revision = unless result.replayed
            Realtime::Publish.call(
              event: "task.completed",
              data: { task_template_id: params[:task_template_id], completion_id: result.completion.id }
            ).revision
          end
          result.reward_achievements.each { |achievement| SendRewardNotificationJob.perform_later(achievement.id) }

          render json: {
            data: {
              completion: completion_payload(result.completion),
              point_events: result.point_events.map { |event| event_payload(event) },
              daily_summary: result.daily_summary.slice(:date, :points_total, :daily_bonus_awarded, :all_goals_completed_at),
              reward_achievements: result.reward_achievements.map { |achievement| reward_payload(achievement) }
            },
            meta: { revision: revision || Realtime::Publish.current_revision, server_time: Time.current }
          }, status: result.replayed ? :ok : :created
        end

        private

        def completion_payload(completion)
          completion.slice(:id, :task_template_id, :completed_on, :sequence, :completed_at, :reverted_at)
        end

        def event_payload(event)
          event.slice(:id, :event_type, :points, :activity_date, :occurred_at)
        end

        def reward_payload(achievement)
          achievement.slice(:id, :period_key, :achieved_at).merge(
            period: achievement.reward_rule.period,
            reward_text: achievement.reward_rule.reward_text
          )
        end
      end
    end
  end
end
