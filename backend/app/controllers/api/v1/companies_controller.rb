module Api
  module V1
    class CompaniesController < BaseController
      MAXIMUM_RESULTS = 8

      # 회사 자동완성: 캐시된 실존 목록에서만 검색한다.
      # q는 Company.normalize_name을 거치므로 기호가 걸러지고 SQL 주입도 불가능하다.
      def index
        query = Company.normalize_name(params[:q])
        companies = query.blank? ? [] : search_companies(query)
        render json: {
          data: companies.map { |company| company.slice(:id, :name, :corp_code, :stock_code) }
        }, status: :ok
      end

      private

      # 앞부분 일치를 먼저, 이어서 포함 일치를 채운다.
      def search_companies(query)
        prefix_matches = Company
          .where("normalized_name LIKE ?", "#{query}%")
          .order(:name)
          .to_a
        return prefix_matches if prefix_matches.size >= MAXIMUM_RESULTS

        contains_matches = Company
          .where("normalized_name LIKE ?", "%#{query}%")
          .where.not(id: prefix_matches.map(&:id))
          .order(:name)
          .limit(MAXIMUM_RESULTS - prefix_matches.size)
        prefix_matches + contains_matches
      end
    end
  end
end
