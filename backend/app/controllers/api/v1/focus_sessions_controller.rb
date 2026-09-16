require "time"

module Api
  module V1
    class FocusSessionsController < BaseController
      DEFAULT_FOCUS_SECONDS = 25.minutes.to_i
      rescue_from FocusSessions::Start::ActiveFocusSessionExists, with: :render_active_session_exists
      rescue_from FocusSessions::Pause::InvalidState, FocusSessions::Resume::InvalidState, FocusSessions::Complete::InvalidState, FocusSessions::Cancel::InvalidState, with: :render_invalid_state
      rescue_from FocusSessions::Complete::TooShort, with: :render_too_short
      rescue_from FocusSessions::Complete::InvalidEndedAt, with: :render_invalid_ended_at
      rescue_from ActiveRecord::RecordInvalid, with: :render_validation_failed

      def current
        render json: { data: focus_session_payload(FocusSession.active.where(user: current_user).order(created_at: :desc).first) }
      end

      def create
        result = FocusSessions::Start.call(
          source_device: current_device,
          planned_seconds: create_params[:planned_seconds].presence&.to_i || DEFAULT_FOCUS_SECONDS,
          idempotency_key: request.headers["Idempotency-Key"],
          kind: create_params[:kind]
        )
        schedule_focus_finalization(result.focus_session)
        revision = unless result.replayed
          Realtime::Publish.call(event: "dashboard.updated", data: { focus_session_id: result.focus_session.id }).revision
        end
        render json: { data: focus_session_payload(result.focus_session), meta: { revision: revision || Realtime::Publish.current_revision, server_time: Time.current } }, status: result.replayed ? :ok : :created
      end

      def pause
        session = FocusSessions::Pause.call(focus_session: find_session)
        revision = Realtime::Publish.call(event: "dashboard.updated", data: { focus_session_id: session.id }).revision
        render json: { data: focus_session_payload(session), meta: { revision: revision, server_time: Time.current } }
      end

      def resume
        session = FocusSessions::Resume.call(focus_session: find_session)
        schedule_focus_finalization(session)
        revision = Realtime::Publish.call(event: "dashboard.updated", data: { focus_session_id: session.id }).revision
        render json: { data: focus_session_payload(session), meta: { revision: revision, server_time: Time.current } }
      end

      def complete
        result = FocusSessions::Complete.call(
          focus_session: find_session,
          idempotency_key: request.headers["Idempotency-Key"],
          ended_at: parse_ended_at
        )
        revision = unless result.replayed
          Realtime::Publish.call(event: "focus.completed", data: { focus_session_id: result.focus_session.id }).revision
        end
        result.reward_achievements.each { |achievement| SendRewardNotificationJob.perform_later(achievement.id) }
        render json: {
          data: {
            focus_session: focus_session_payload(result.focus_session),
            point_event: result.point_event&.slice(:id, :event_type, :points, :activity_date, :occurred_at),
            focus_task_completion: result.focus_task_completion&.slice(:id, :task_template_id, :sequence, :completed_at),
            daily_summary: result.daily_summary&.slice(:date, :points_total),
            reward_achievements: result.reward_achievements.map { |achievement| reward_payload(achievement) }
          },
          meta: { revision: revision || Realtime::Publish.current_revision, server_time: Time.current }
        }, status: result.replayed ? :ok : :created
      end

      def cancel
        session = FocusSessions::Cancel.call(focus_session: find_session)
        revision = Realtime::Publish.call(event: "dashboard.updated", data: { focus_session_id: session.id }).revision
        render json: { data: focus_session_payload(session), meta: { revision: revision, server_time: Time.current } }
      end

      private

      def schedule_focus_finalization(session)
        FinalizeFocusSessionJob.set(wait_until: session.scheduled_end_at).perform_later(session.id)
      end

      def find_session
        current_user.focus_sessions.find(params[:id])
      end

      def create_params
        params.require(:focus_session).permit(:planned_seconds, :kind)
      end

      def parse_ended_at
        raw_value = params[:ended_at].presence
        raw_value ? Time.iso8601(raw_value) : Time.current
      rescue ArgumentError
        raise FocusSessions::Complete::InvalidEndedAt
      end

      def focus_session_payload(session)
        return nil unless session

        session.slice(:id, :source_device_id, :kind, :started_at, :planned_seconds, :status, :paused_at, :paused_seconds, :ended_at, :completed_seconds)
      end

      def reward_payload(achievement)
        achievement.slice(:id, :period_key, :achieved_at).merge(
          period: achievement.reward_rule.period,
          reward_text: achievement.reward_rule.reward_text
        )
      end

      def render_active_session_exists
        render json: { error: { code: "active_focus_session_exists", message: "다른 기기에서 실행 중인 집중 타이머가 있어요." } }, status: :conflict
      end

      def render_invalid_state
        render json: { error: { code: "invalid_focus_session_state", message: "현재 타이머 상태에서는 이 작업을 할 수 없어요." } }, status: :conflict
      end

      def render_too_short
        render json: { error: { code: "focus_session_too_short", message: "예정 시간의 80% 이상 집중해야 완료로 기록돼요." } }, status: :unprocessable_entity
      end

      def render_invalid_ended_at
        render json: { error: { code: "invalid_ended_at", message: "유효한 종료 시각이 아니에요." } }, status: :unprocessable_entity
      end

      def render_validation_failed(error)
        render json: { error: { code: "validation_failed", message: error.record.errors.full_messages.to_sentence } }, status: :unprocessable_entity
      end
    end
  end
end
