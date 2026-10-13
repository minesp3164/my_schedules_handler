require "net/http"

module Companies
  # DART(전자공시) 전체 법인 목록을 내려받아 회사 캐시를 갱신한다.
  # DART_API_KEY 미설정 시 아무 것도 하지 않으며, 시드 목록만으로도 동작한다.
  class Sync
    ENDPOINT = "https://opendart.fss.or.kr/api/corp.xml"
    Result = Data.define(:synced, :message)

    def self.call(...)
      new(...).call
    end

    def initialize(api_key: ENV["DART_API_KEY"].to_s)
      @api_key = api_key
    end

    def call
      return Result.new(0, "DART_API_KEY 미설정이라 동기화를 건너뜁니다.") if @api_key.blank?

      body = fetch
      raise "DART 오류 응답" if body.include?("<status>") && !body.include?("<status>000</status>")

      synced = Import.call(xml: body)
      Result.new(synced, "#{synced}건 동기화")
    rescue StandardError => e
      Result.new(0, "동기화 실패: #{e.message}")
    end

    private

    def fetch
      uri = URI(ENDPOINT)
      uri.query = URI.encode_www_form(crtfc_key: @api_key)
      response = Net::HTTP.get_response(uri)
      raise "DART HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

      response.body
    end
  end
end
