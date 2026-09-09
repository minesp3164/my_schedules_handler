require "digest"

module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_device

    def connect
      self.current_device = find_verified_device
    end

    private

    def find_verified_device
      token = request.params["token"].to_s
      device = Device.active.find_by(access_token_digest: Digest::SHA256.hexdigest(token))
      reject_unauthorized_connection unless device

      device.update_column(:last_seen_at, Time.current)
      device
    end
  end
end
