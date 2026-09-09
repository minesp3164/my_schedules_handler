require "ipaddr"
require "resolv"
require "uri"

module Notifications
  class WebPushEndpoint
    BLOCKED_NETWORKS = %w[
      0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8
      169.254.0.0/16 172.16.0.0/12 192.0.0.0/24 192.168.0.0/16
      198.18.0.0/15 224.0.0.0/4 ::/128 ::1/128 fc00::/7 fe80::/10
    ].map { |network| IPAddr.new(network) }.freeze

    def self.valid?(endpoint, resolver: Resolv.method(:getaddresses))
      uri = URI.parse(endpoint)
      return false unless uri.is_a?(URI::HTTPS) && uri.host.present? && uri.userinfo.nil? && uri.port == 443

      addresses = resolver.call(uri.host)
      addresses.present? && addresses.all? { |address| public_address?(address) }
    rescue URI::InvalidURIError, IPAddr::InvalidAddressError, Resolv::ResolvError, SocketError
      false
    end

    def self.public_address?(address)
      ip = IPAddr.new(address)
      BLOCKED_NETWORKS.none? { |network| network.include?(ip) }
    end
    private_class_method :public_address?
  end
end
