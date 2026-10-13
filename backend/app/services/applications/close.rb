module Applications
  # 불합격·포기는 종결 상태만 남긴다. 포인트는 회수하지 않는다(실패를 벌주지 않는 설계 원칙).
  class Close
    Result = Data.define(:application, :changed)

    def self.call(...)
      new(...).call
    end

    def initialize(application_id:, status:, user:)
      @application_id = application_id
      @status = status
      @user = user
    end

    def call
      application = @user.applications.find(@application_id)
      # 합격 등 이미 종결된 건은 덮어쓰지 않는다.
      return Result.new(application, false) unless application.status == "active"

      application.update!(status: @status, closed_at: Time.current)
      Result.new(application, true)
    end
  end
end
