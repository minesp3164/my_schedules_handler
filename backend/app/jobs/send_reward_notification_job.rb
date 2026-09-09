class SendRewardNotificationJob < ApplicationJob
  queue_as :notifications

  def perform(reward_achievement_id)
    achievement = RewardAchievement.includes(:reward_rule).find(reward_achievement_id)
    Device.find_each do |device|
      next unless device.push_channel

      Notifications::Deliver.call(
        device: device,
        notification_type: "reward_#{achievement.reward_rule.period}",
        schedule_key: achievement.id,
        title: "보상 달성!",
        body: achievement.reward_rule.reward_text,
        data: { reward_achievement_id: achievement.id, period: achievement.reward_rule.period }
      )
    end
  end
end
