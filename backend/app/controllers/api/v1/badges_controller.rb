module Api
  module V1
    class BadgesController < BaseController
      # 읽을 때 평가해서, 완료 흐름을 거치지 않은 지표 변경도 배지로 반영한다.
      def index
        Badges::Evaluate.call(user: current_user)
        progress = Milestones::Progress.call(user: current_user)
        achievements = current_user.badge_achievements.index_by(&:badge_rule_id)

        render json: {
          data: {
            badges: BadgeRule.where(active: true).order(:position, :key).map do |rule|
              rule.slice(:key, :category, :title, :description, :icon, :metric, :threshold, :position)
                .merge(achieved_at: achievements[rule.id]&.achieved_at)
            end,
            progress: progress.to_h
          }
        }
      end
    end
  end
end
