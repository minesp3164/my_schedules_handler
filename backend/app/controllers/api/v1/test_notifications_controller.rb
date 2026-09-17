module Api
  module V1
    class TestNotificationsController < BaseController
      def create
        unless current_device.push_channel
          return render json: { error: { code: "no_push_channel", message: "이 기기에 등록된 푸시 정보가 없어요." } }, status: :unprocessable_entity
        end

        result = Notifications::Deliver.call(
          device: current_device,
          notification_type: "daily_nudge_test",
          schedule_key: "test-#{SecureRandom.hex(8)}",
          title: Notifications::DailyNudge::TITLE,
          body: Notifications::DailyNudge::BODY,
          data: { test: true }
        )

        if result.sent
          render json: { data: { status: result.delivery.status } }, status: :created
        else
          render json: { error: { code: "delivery_failed", message: result.delivery.error_message.presence || "발송에 실패했어요." } }, status: :unprocessable_entity
        end
      end
    end
  end
end
