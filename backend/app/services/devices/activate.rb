require "digest"

module Devices
  class Activate
    class InvalidAccessKey < StandardError; end

    Result = Data.define(:device, :access_token)

    def self.call(...)
      new(...).call
    end

    def initialize(installation_id:, name:, platform:, access_key: nil, **)
      @installation_id = installation_id
      @name = name
      @platform = platform
      @access_key = access_key.to_s
    end

    def call
      verify_access_key!

      token = SecureRandom.urlsafe_base64(32)
      device = Device.find_or_initialize_by(installation_id: @installation_id)
      device.user ||= User.order(:created_at).first || User.create!
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

    private

    def verify_access_key!
      expected = ENV["PERSONAL_ACCESS_KEY"].to_s
      if expected.empty?
        raise InvalidAccessKey if Rails.env.production?

        return
      end

      provided = Digest::SHA256.hexdigest(@access_key)
      configured = Digest::SHA256.hexdigest(expected)
      raise InvalidAccessKey unless ActiveSupport::SecurityUtils.secure_compare(provided, configured)
    end
  end
end
