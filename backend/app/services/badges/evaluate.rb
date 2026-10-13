module Badges
  # 배지 평가는 비규격·멱등이다. 달성 배지를 추가하고, 사용자가 TASK를
  # 취소(완료 취소·삭제)해 지표가 기준 미달이 되면 달성 기록을 회수한다.
  class Evaluate
    Result = Data.define(:created, :revoked)

    def self.call(...)
      new(...).call
    end

    def initialize(user:, now: Time.current)
      @user = user
      @now = now
    end

    def call
      rules = SyncDefaultRules.call
      progress = Milestones::Progress.call(user: @user)
      achievements = @user.badge_achievements.includes(:badge_rule).index_by(&:badge_rule_id)
      created = []
      revoked = []
      rules.each do |rule|
        achievement = achievements[rule.id]
        current = progress.public_send(rule.metric)
        if achievement
          revoked << achievement if current < rule.threshold && achievement.destroy
        elsif current >= rule.threshold
          record = create_achievement(rule)
          created << record if record
        end
      end
      Result.new(created, revoked)
    end

    private

    def create_achievement(rule)
      BadgeAchievement.create!(user: @user, badge_rule: rule, achieved_at: @now)
    rescue ActiveRecord::RecordNotUnique
      nil
    rescue ActiveRecord::RecordInvalid => error
      raise unless error.record.is_a?(BadgeAchievement) && BadgeAchievement.exists?(user: @user, badge_rule: rule)

      nil
    end
  end
end
