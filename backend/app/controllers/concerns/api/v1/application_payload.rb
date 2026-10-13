module Api
  module V1
    # 지원 건·단계·단계 이벤트의 JSON 페이로드를 컨트롤러 간에 공유한다.
    module ApplicationPayload
      def application_payload(application)
        events = application.application_stage_events.active
          .includes(:application_stage)
          .sort_by { |event| event.application_stage.position }
        {
          id: application.id,
          company: application.company,
          title: application.title,
          url: application.url,
          memo: application.memo,
          status: application.status,
          closed_at: application.closed_at,
          created_at: application.created_at,
          stages: events.map { |event| stage_event_payload(event) }
        }
      end

      def stage_event_payload(event)
        {
          id: event.id,
          stage_id: event.application_stage_id,
          name: event.application_stage.name,
          kind: event.stage_kind,
          points: event.points,
          completed_at: event.completed_at
        }
      end

      def stage_payload(stage)
        stage.slice(:id, :name, :kind, :position, :active).merge(points: stage.points)
      end

      def milestone_event_payload(event)
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
