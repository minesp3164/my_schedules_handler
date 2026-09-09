require "digest"

module Devices
  class Activate
    Result = Data.define(:device, :access_token)

    class InvalidSetupKey < StandardError; end
    class SetupNotConfigured < StandardError; end

    def self.call(...)
      new(...).call
    end

    def initialize(setup_key:, installation_id:, name:, platform:)
      @setup_key = setup_key.to_s
      @installation_id = installation_id
      @name = name
      @platform = platform
    end

    def call
      expected_setup_key = ENV["SETUP_KEY"].presence
      raise SetupNotConfigured if expected_setup_key.blank?
      raise InvalidSetupKey unless ActiveSupport::SecurityUtils.secure_compare(Digest::SHA256.hexdigest(@setup_key), Digest::SHA256.hexdigest(expected_setup_key))

      token = SecureRandom.urlsafe_base64(32)
      device = Device.find_or_initialize_by(installation_id: @installation_id)
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
