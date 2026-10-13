module Companies
  # DART 키 없이도 자동확인이 쓸모 있게 돌아가도록 주요 채용처를 미리 넣어둔다.
  # 이미 있는 이름은 건드리지 않는다(DART 동기화가 이후 보강한다).
  class SeedDefaults
    DEFAULT_NAMES = [
      # 대기업·제조
      "삼성전자", "삼성SDI", "삼성물산", "삼성엔지니어링", "삼성SDS", "삼성바이오로직스",
      "현대자동차", "기아", "현대모비스", "현대글로비스", "현대건설", "현대오토에버",
      "SK하이닉스", "SK이노베이션", "SK텔레콤", "SK스퀘어", "SK바이오사이언스",
      "LG전자", "LG화학", "LG디스플레이", "LG CNS", "LG생활건강",
      "롯데케미칼", "롯데제과", "롯데쇼핑", "롯데지주",
      "GS건설", "GS리테일", "신세계", "현대백화점", "이마트",
      "두산에너빌리티", "포스코홀딩스", "포스코건설",
      "한화에어로스페이스", "한화솔루션", "한화오션", "한진", "대한항공", "아시아나항공",
      "KT", "CJ제일제당", "CJ대한통운", "오리온", "동원산업", "S-Oil",
      "셀트리온", "유한양행", "종근당", "GC녹십자", "아모레퍼시픽", "효성", "효성중공업",
      # IT·플랫폼·게임
      "네이버", "카카오", "카카오페이", "카카오모빌리티", "쿠팡", "우아한형제들",
      "당근마켓", "비바리퍼블리카", "토스뱅크", "라인", "크래프톤", "엔씨소프트",
      "넷마블", "스마일게이트", "넥슨코리아", "펄어비스", "라이엇게임즈코리아", "NHN",
      "야놀자", "무신사", "크로키닷컴", "버킷플레이스", "리디", "루닛", "버즈빌",
      "하이퍼커넥트", "원티드랩", "직방", "쏘카", "리멤버",
      # 해외 기업 한국 법인
      "구글코리아", "마이크로소프트코리아", "아마존웹서비스코리아", "애플코리아",
      "메타코리아", "인텔코리아", "IBM코리아", "오라클코리아",
      # 공공·기관·지자체·병원
      "한국전력공사", "한국철도공사", "한국토지주택공사", "국민연금공단",
      "한국산업은행", "중소기업은행", "신용보증기금", "한국고용정보원",
      "서울특별시", "경기도", "부산광역시",
      "서울대학교병원", "삼성서울병원", "서울아산병원"
    ].freeze

    def self.call
      now = Time.current
      rows = DEFAULT_NAMES.filter_map do |name|
        normalized_name = Company.normalize_name(name)
        next if normalized_name.blank? || Company.exists?(normalized_name: normalized_name)

        {
          id: SecureRandom.uuid,
          name: name,
          normalized_name: normalized_name,
          corp_code: nil,
          stock_code: nil,
          source: "seed",
          created_at: now,
          updated_at: now
        }
      end
      rows.each_slice(500) { |slice| Company.insert_all(slice) }
      rows.size
    end
  end
end
