# 주 1회 DART 전체 법인 목록을 내려받아 회사 자동완성 캐시를 갱신한다.
class CompaniesSyncJob < ApplicationJob
  queue_as :default

  def perform
    result = Companies::Sync.call
    Rails.logger.info("[companies.sync] #{result.message}")
  end
end
