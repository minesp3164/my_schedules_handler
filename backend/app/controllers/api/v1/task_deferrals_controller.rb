module Api
  module V1
    # 회복 패스 사용(할 일 이월)과 되돌리기.
    class TaskDeferralsController < BaseController
      rescue_from Tasks::Defer::RecoveryRequired, with: :render_recovery_required
      rescue_from Tasks::Defer::NotEligible, with: :render_not_eligible
      rescue_from Tasks::UndoDefer::NotUndoable, with: :render_not_undoable

      def create
        result = Tasks::Defer.call(
          user: current_user,
          task_template_id: params.require(:task_template_id),
          now: Time.current
        )
        revision = if result.replayed
          Realtime::Publish.current_revision
        else
          Realtime::Publish.call(
            event: "task.deferred",
            data: { task_template_id: result.deferral.task_template_id, to_date: result.deferral.to_date }
          ).revision
        end

        render json: {
          data: {
            deferral: deferral_payload(result.deferral),
            redemption: redemption_payload(result.redemption),
            daily_summary: summary_payload(result),
            bonus_awarded: result.bonus_event.present?
          },
          meta: { revision: revision, server_time: Time.current }
        }, status: result.replayed ? :ok : :created
      end

      def destroy
        result = Tasks::UndoDefer.call(user: current_user, id: params[:id], now: Time.current)
        Realtime::Publish.call(
          event: "task.deferred_undone",
          data: { task_template_id: result.deferral.task_template_id }
        ).revision

        render json: {
          data: {
            deferral: deferral_payload(result.deferral),
            redemption: redemption_payload(result.redemption)
          },
          meta: { revision: Realtime::Publish.current_revision, server_time: Time.current }
        }
      end

      private

      def deferral_payload(deferral)
        deferral.slice(:id, :task_template_id, :from_date, :to_date)
      end

      def redemption_payload(redemption)
        redemption&.slice(:id, :reward_kind, :status, :unlocked_at, :redeemed_at, :payload)
      end

      def summary_payload(result)
        summary = result.daily_summary
        return summary.slice(:date, :points_total, :daily_bonus_awarded) if summary

        { date: result.deferral.from_date, points_total: 0, daily_bonus_awarded: false }
      end

      def render_recovery_required
        render json: {
          error: { code: "recovery_required", message: "회복 패스를 먼저 받아야 할 일을 옮길 수 있어요." }
        }, status: :conflict
      end

      def render_not_eligible
        render json: {
          error: { code: "deferral_not_allowed", message: "그 할 일은 지금 옮길 수 없어요. 이미 완료했거나 오늘에 없는 할 일이에요." }
        }, status: :unprocessable_entity
      end

      def render_not_undoable
        render json: {
          error: { code: "not_undoable", message: "이미 지난 날의 이월은 되돌릴 수 없어요." }
        }, status: :unprocessable_entity
      end
    end
  end
end
