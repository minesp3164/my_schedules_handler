require "nokogiri"

module Companies
  # DART corp.xml(전체 법인 목록)을 companies 테이블에 넣는다.
  # normalized_name이 같으면 덮어쓰기 하므로 재실행은 안전하다.
  class Import
    BATCH_SIZE = 1_000
    ROW_CONTAINERS = %w[list item].freeze
    FIELDS = %w[corp_name corp_code stock_code].freeze

    def self.call(...)
      new(...).call
    end

    def initialize(xml:)
      @xml = xml
    end

    def call
      rows = parse(@xml).uniq { |row| row[:normalized_name] }
      now = Time.current
      rows.each_slice(BATCH_SIZE) do |slice|
        Company.upsert_all(
          slice.map { |row| row.merge(created_at: now, updated_at: now) },
          unique_by: :normalized_name,
          update_only: %i[name corp_code stock_code source updated_at]
        )
      end
      rows.size
    end

    private

    # 외부 DTD 참조는 끊고 본문만 순회한다(대용량 XML도 메모리에 한꺼번에 올리지 않는다).
    def parse(xml)
      reader = Nokogiri::XML::Reader(xml.sub(/<!DOCTYPE.*?>\s*/m, ""))
      rows = []
      current = nil
      reader.each do |node|
        case node.node_type
        when Nokogiri::XML::Reader::TYPE_ELEMENT
          if ROW_CONTAINERS.include?(node.name)
            current = {}
          elsif current && FIELDS.include?(node.name)
            current[node.name] = node.inner_xml.strip
          end
        when Nokogiri::XML::Reader::TYPE_END_ELEMENT
          next unless ROW_CONTAINERS.include?(node.name) && current

          row = build_row(current)
          rows << row if row
          current = nil
        end
      end
      rows
    end

    def build_row(attrs)
      name = attrs["corp_name"].to_s
      normalized_name = Company.normalize_name(name)
      return if normalized_name.blank?

      {
        id: SecureRandom.uuid,
        name: name,
        normalized_name: normalized_name,
        corp_code: attrs["corp_code"].to_s,
        stock_code: attrs["stock_code"].to_s,
        source: "dart"
      }
    end
  end
end
