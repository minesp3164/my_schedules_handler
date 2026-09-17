module Realtime
  class Ticket
    TTL = 12.hours

    def self.issue(device:)
      verifier.generate({ "device_id" => device.id, "exp" => TTL.from_now.to_i })
    end

    def self.device_for(ticket)
      data = verifier.verified(ticket.to_s)
      return unless data.is_a?(Hash) && data["exp"].to_i >= Time.current.to_i

      Device.active.find_by(id: data["device_id"])
    end

    def self.verifier
      Rails.application.message_verifier("realtime-ticket")
    end
  end
end
