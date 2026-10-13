module Api
  module V1
    class ApplicationsController < BaseController
      include ApplicationPayload

      def index
        ::Applications::SyncDefaultStages.call(user: current_user)
        applications = current_user.applications.in_order.includes(application_stage_events: :application_stage)
        stages = current_user.application_stages.active_in_order
        render json: {
          data: {
            applications: applications.map { |application| application_payload(application) },
            stages: stages.map { |stage| stage_payload(stage) }
          },
          meta: { revision: Realtime::Publish.current_revision, server_time: Time.current }
        }
      end

      def create
        attributes = params.require(:application).permit(:company, :company_id, :title, :url, :memo)
        application = current_user.applications.create!(
          company: canonical_company_name(attributes[:company], attributes[:company_id]),
          title: attributes[:title].presence,
          url: attributes[:url].presence,
          memo: attributes[:memo].presence
        )
        revision = Realtime::Publish.call(event: "application.created", data: { application_id: application.id }).revision
        render json: {
          data: { application: application_payload(application) },
          meta: { revision: revision, server_time: Time.current }
        }, status: :created
      end

      def update
        status = params.require(:application).require(:status)
        unless Application::CLOSABLE_STATUSES.include?(status)
          return render json: {
            error: { code: "invalid_status", message: "종결 상태는 불합격·포기만 선택할 수 있어요." }
          }, status: :unprocessable_entity
        end

        result = ::Applications::Close.call(application_id: params[:id], status: status, user: current_user)
        revision = if result.changed
          Realtime::Publish.call(event: "application.updated", data: { application_id: result.application.id }).revision
        end
        render json: {
          data: { application: application_payload(result.application) },
          meta: { revision: revision || Realtime::Publish.current_revision, server_time: Time.current }
        }
      end

      private

      # 목록에서 확인된 회사로 받으면 이름은 정본을 쓴다(기존 할 일 완료와 같은 규칙).
      def canonical_company_name(typed, company_id)
        company = company_id.presence && Company.find_by(id: company_id)
        if company && Company.normalize_name(company.name) == Company.normalize_name(typed.to_s)
          company.name
        else
          typed.to_s.strip
        end
      end
    end
  end
end
