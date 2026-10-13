module Applications
  # 단계는 사용자가 자유롭게 바꾸지만, 첫 사용을 위해 기본 3단계를 제공한다.
  class SyncDefaultStages
    DEFAULTS = [
      { name: "이력서 제출", kind: "submission", position: 0 },
      { name: "면접", kind: "interview", position: 1 },
      { name: "합격", kind: "pass", position: 2 }
    ].freeze

    def self.call(user:)
      return user.application_stages.active_in_order unless user.application_stages.none?

      ApplicationStage.transaction do
        DEFAULTS.map { |attributes| user.application_stages.create!(attributes) }
      end
      user.application_stages.active_in_order
    end
  end
end
