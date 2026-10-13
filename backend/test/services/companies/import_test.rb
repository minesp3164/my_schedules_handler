require "test_helper"

class Companies::ImportTest < ActiveSupport::TestCase
  XML = <<~XML
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE corp SYSTEM "https://opendart.fss.or.kr/api/corp.dtd">
    <result>
      <list>
        <corp_code>00126380</corp_code>
        <corp_name>삼성전자</corp_name>
        <stock_code>005930</stock_code>
      </list>
      <list>
        <corp_code>00164777</corp_code>
        <corp_name>주식회사 카카오</corp_name>
        <stock_code></stock_code>
      </list>
      <list>
        <corp_code>00126380</corp_code>
        <corp_name>삼성전자(주)</corp_name>
        <stock_code>005930</stock_code>
      </list>
    </result>
  XML

  test "imports corp rows and dedupes by normalized name" do
    synced = Companies::Import.call(xml: XML)

    assert_equal 2, synced
    assert_equal 2, Company.count
    assert Company.exists?(normalized_name: "삼성전자")
    assert Company.exists?(normalized_name: "카카오")
  end

  test "re-import updates the existing row instead of duplicating" do
    Companies::Import.call(xml: XML)

    Companies::Import.call(xml: XML.gsub("<stock_code>005930</stock_code>", "<stock_code>999999</stock_code>"))

    assert_equal 2, Company.count
    assert_equal "999999", Company.find_by!(normalized_name: "삼성전자").stock_code
  end

  test "normalize_name strips legal form words and brackets" do
    assert_equal "네이버", Company.normalize_name("네이버(주)")
    assert_equal "카카오", Company.normalize_name("주식회사 카카오")
    assert_equal "삼성전자", Company.normalize_name(" 삼성전자 ")
    assert_equal "googlekorea", Company.normalize_name("Google Korea, Inc.")
  end
end
