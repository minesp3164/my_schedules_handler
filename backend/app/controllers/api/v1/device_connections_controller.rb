module Api
  module V1
    class DeviceConnectionsController < BaseController
      def destroy
        current_device.update!(
          revoked_at: Time.current,
          access_token_digest: Digest::SHA256.hexdigest(SecureRandom.urlsafe_base64(32)),
          expo_push_token: nil,
          web_push_subscription: nil
        )
        head :no_content
      end
    end
  end
end
