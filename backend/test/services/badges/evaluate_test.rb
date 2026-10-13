require "test_helper"
require "digest"

class Badges::EvaluateTest < ActiveSupport::TestCase
  setup do
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Badge device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest("badge-token")
    )
    @achieved_at = Time.zone.parse("2026-09-23 09:00:00")
  end

  test "syncs all default rules only once" do
    Badges::Evaluate.call(user: @user, now: @achieved_at)

    assert_equal 63, BadgeRule.count
    assert_equal 63, BadgeRule.where(active: true).order(:position, :key).count

    Badges::Evaluate.call(user: @user, now: @achieved_at)

    assert_equal 63, BadgeRule.count
    assert_equal %w[algorithm apply focus portfolio routine steady],
      BadgeRule.where(active: true).distinct.order(:category).pluck(:category)
  end

  test "records achievements once for every met threshold" do
    3.times do |index|
      TaskTemplate.create!(user: @user, title: "루틴 #{index + 1}", points: 10, target_count: 1, position: index, kind: "custom")
    end

    first = Badges::Evaluate.call(user: @user, now: @achieved_at)
    replay = Badges::Evaluate.call(user: @user, now: @achieved_at + 1.minute)

    assert_equal %w[routine_designer routine_first],
      first.created.map { |achievement| achievement.badge_rule.key }.sort
    assert_empty replay.created
    assert_equal 2, BadgeAchievement.count
    assert_equal @achieved_at, BadgeAchievement.find_by!(badge_rule: BadgeRule.find_by!(key: "routine_first")).achieved_at
  end

  test "skips thresholds that are not met yet" do
    TaskTemplate.create!(user: @user, title: "루틴 하나", points: 10, target_count: 1, position: 0, kind: "custom")

    result = Badges::Evaluate.call(user: @user, now: @achieved_at)

    keys = result.created.map { |achievement| achievement.badge_rule.key }
    assert_equal ["routine_first"], keys
    refute_includes keys, "routine_system"
    refute_includes keys, "steady_30d"
  end

  test "measures application and algorithm work by kind completion counts" do
    application = TaskTemplate.create!(user: @user, title: "실제 지원 1건", points: 25, target_count: 5, position: 0, kind: "application")
    algorithm = TaskTemplate.create!(user: @user, title: "알고리즘 1문제", points: 1, target_count: 10, position: 1, kind: "algorithm")
    5.times do |index|
      DailyTaskCompletion.create!(task_template: application, source_device: @device, completed_on: Date.new(2026, 9, 10) + index, completed_at: Time.zone.parse("2026-09-10 10:00") + index.days, sequence: 1)
    end
    10.times do |index|
      DailyTaskCompletion.create!(task_template: algorithm, source_device: @device, completed_on: Date.new(2026, 9, 10) + index, completed_at: Time.zone.parse("2026-09-10 12:00") + index.days, sequence: 1)
    end

    result = Badges::Evaluate.call(user: @user, now: @achieved_at)

    keys = result.created.map { |achievement| achievement.badge_rule.key }.sort
    assert_equal %w[algo_1 algo_10 algo_3 algo_7 apply_1 apply_3 apply_5 routine_first
      steady_done_1 steady_done_10 steady_done_3 steady_done_7],
      keys
    refute_includes keys, "apply_20"
  end

  test "revokes achievements when cancelling a completion drops the metric below its threshold" do
    task = TaskTemplate.create!(user: @user, title: "루틴 하나", points: 10, target_count: 1, position: 0, kind: "custom")
    completion = DailyTaskCompletion.create!(task_template: task, source_device: @device, completed_on: Date.new(2026, 9, 10), completed_at: Time.zone.parse("2026-09-10 10:00"), sequence: 1)
    PointEvent.create!(user: @user, source_device: @device, daily_task_completion: completion, activity_date: Date.new(2026, 9, 10), event_type: "task_completion", points: 10, idempotency_key: "badge-cancel-task", occurred_at: Time.zone.parse("2026-09-10 10:00"))

    earned = Badges::Evaluate.call(user: @user, now: @achieved_at)
    assert_equal %w[routine_first steady_1d steady_done_1],
      earned.created.map { |achievement| achievement.badge_rule.key }.sort

    Tasks::Revert.call(completion_id: completion.id)
    revoked = Badges::Evaluate.call(user: @user, now: @achieved_at + 1.hour)

    assert_empty revoked.created
    assert_equal %w[steady_1d steady_done_1],
      revoked.revoked.map { |achievement| achievement.badge_rule.key }.sort
    refute BadgeAchievement.exists?(user: @user, badge_rule: BadgeRule.find_by!(key: "steady_done_1"))
    refute BadgeAchievement.exists?(user: @user, badge_rule: BadgeRule.find_by!(key: "steady_1d"))
    # 태스크 자체는 남아 있으므로 루틴 배지는 회수하지 않는다.
    assert BadgeAchievement.exists?(user: @user, badge_rule: BadgeRule.find_by!(key: "routine_first"))
  end

  test "revokes routine achievements when the task is deactivated" do
    task = TaskTemplate.create!(user: @user, title: "루틴 하나", points: 10, target_count: 1, position: 0, kind: "custom")

    Badges::Evaluate.call(user: @user, now: @achieved_at)
    Tasks::Deactivate.call(task_template_id: task.id, user: @user)
    result = Badges::Evaluate.call(user: @user, now: @achieved_at + 1.hour)

    assert_equal ["routine_first"], result.revoked.map { |achievement| achievement.badge_rule.key }
    assert_empty BadgeAchievement.where(user: @user)
  end
end
