module Api
  module V1
    class ApplicationStagesController < BaseController
      include ApplicationPayload

      def index
        stages = ::Applications::SyncDefaultStages.call(user: current_user)
        render json: {
          data: { stages: stages.map { |stage| stage_payload(stage) } },
          meta: { revision: Realtime::Publish.current_revision, server_time: Time.current }
        }
      end

      def create
        # 기본 단계가 아직 없으면 순서 계산 전에 먼저 채운다.
        ::Applications::SyncDefaultStages.call(user: current_user)
        attributes = params.require(:application_stage).permit(:name, :kind, :position)
        stage = current_user.application_stages.create!(
          name: attributes.require(:name),
          kind: attributes.require(:kind),
          position: attributes[:position].presence || next_position
        )
        revision = Realtime::Publish.call(event: "application_stage.updated", data: { stage_id: stage.id }).revision
        render json: {
          data: { stage: stage_payload(stage) },
          meta: { revision: revision, server_time: Time.current }
        }, status: :created
      end

      def update
        stage = current_user.application_stages.find(params[:id])
        attributes = params.require(:application_stage).permit(:name, :position)
        updates = attributes.to_h.transform_values { |value| value.is_a?(String) ? value.strip : value }.compact_blank
        stage.update!(updates)
        revision = Realtime::Publish.call(event: "application_stage.updated", data: { stage_id: stage.id }).revision
        render json: {
          data: { stage: stage_payload(stage) },
          meta: { revision: revision, server_time: Time.current }
        }
      end

      # 삭제가 아니라 비활성화다. 완료 이력은 그대로 남고 신규 지원 건에는 나타나지 않는다.
      def destroy
        stage = current_user.application_stages.find(params[:id])
        if stage.active? && current_user.application_stages.active_in_order.where.not(id: stage.id).none?
          return render json: {
            error: { code: "last_active_stage", message: "마지막 활성 단계는 비활성화할 수 없어요." }
          }, status: :unprocessable_entity
        end

        stage.update!(active: false) if stage.active?
        revision = Realtime::Publish.call(event: "application_stage.updated", data: { stage_id: stage.id }).revision
        render json: {
          data: { stage: stage_payload(stage) },
          meta: { revision: revision, server_time: Time.current }
        }
      end

      private

      def next_position
        current_user.application_stages.maximum(:position).to_i + 1
      end
    end
  end
end
