module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_device

    def connect
      self.current_device = find_verified_device
    end

    private

    def find_verified_device
      device = Realtime::Ticket.device_for(request.params["ticket"])
      reject_unauthorized_connection unless device

      device.update_column(:last_seen_at, Time.current)
      device
    end
  end
end
