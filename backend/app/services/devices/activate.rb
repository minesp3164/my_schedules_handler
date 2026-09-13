require "digest"

module Devices
  class Activate
    Result = Data.define(:device, :access_token)

    def self.call(...)
      new(...).call
    end

    def initialize(installation_id:, name:, platform:, **)
      @installation_id = installation_id
      @name = name
      @platform = platform
    end

    def call
      token = SecureRandom.urlsafe_base64(32)
      device = Device.find_or_initialize_by(installation_id: @installation_id)
      device.user ||= User.create!
      device.assign_attributes(
        name: @name,
        platform: @platform,
        access_token_digest: Digest::SHA256.hexdigest(token),
        last_seen_at: Time.current,
        revoked_at: nil
      )
      device.save!

      Result.new(device, token)
    end
  end
end
