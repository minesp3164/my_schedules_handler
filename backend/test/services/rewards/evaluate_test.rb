require "test_helper"
require "digest"

class Rewards::EvaluateTest < ActiveSupport::TestCase
  setup do
    @device = Device.create!(
      installation_id: SecureRandom.uuid,
      name: "Reward device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest("reward-token")
    )
    @date = Date.new(2026, 9, 9)
    Setting.instance.update!(daily_reward_points: 100, weekly_reward_points: 300)
  end

  test "records daily and weekly rewards only once for each period" do
    create_event(date: @date - 2, points: 100, key: "reward-1")
    create_event(date: @date - 1, points: 100, key: "reward-2")
    create_event(date: @date, points: 100, key: "reward-3")

    first = Rewards::Evaluate.call(date: @date, achieved_at: Time.zone.parse("2026-09-09 12:00:00"))
    replay = Rewards::Evaluate.call(date: @date, achieved_at: Time.zone.parse("2026-09-09 12:01:00"))

    assert_equal %w[daily weekly], first.achievements.map { |achievement| achievement.reward_rule.period }.sort
    assert_empty replay.achievements
    assert_equal 2, RewardAchievement.count
    assert_equal "2026-W37", RewardAchievement.find_by!(reward_rule: RewardRule.find_by!(period: "weekly")).period_key
  end

  test "uses changed settings when syncing the default reward rules" do
    Setting.instance.update!(daily_reward_points: 50, daily_reward_text: "50점 달성!")
    create_event(date: @date, points: 50, key: "reward-setting")

    result = Rewards::Evaluate.call(date: @date)
    daily_rule = RewardRule.find_by!(period: "daily")

    assert_equal 50, daily_rule.required_points
    assert_equal "50점 달성!", daily_rule.reward_text
    assert_equal ["daily"], result.achievements.map { |achievement| achievement.reward_rule.period }
  end

  private

  def create_event(date:, points:, key:)
    PointEvent.create!(
      source_device: @device,
      activity_date: date,
      event_type: "adjustment",
      points: points,
      idempotency_key: key,
      occurred_at: Time.zone.parse("#{date} 10:00:00")
    )
  end
end
