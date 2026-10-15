require "test_helper"
require "digest"

class Tasks::RevertTest < ActiveSupport::TestCase
  setup do
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Revert device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest("revert-token")
    )
    @task = TaskTemplate.create!(
      user: @user, title: "알고리즘", points: 15, target_count: 1, position: 0, kind: "algorithm"
    )
    @other = TaskTemplate.create!(
      user: @user, title: "이력서", points: 20, target_count: 1, position: 1, kind: "portfolio"
    )
    @date = Date.new(2026, 9, 11)
    @now = Time.zone.parse("2026-09-11 10:00:00")
  end

  test "reverts the daily bonus when the undone completion breaks the daily goal" do
    completion = complete_all!

    bonus = PointEvent.effective.find_by!(user: @user, event_type: "daily_bonus", activity_date: @date)
    assert bonus.points.positive?
    assert DailySummary.find_by(date: @date).daily_bonus_awarded

    _completion, summary, changed = Tasks::Revert.call(completion_id: completion.id)

    assert changed
    assert_not_nil bonus.reload.reversed_at, "취소된 완료의 보너스 이벤트는 reversed_at으로 회수된다"
    assert_not summary.daily_bonus_awarded
    assert_nil summary.all_goals_completed_at, "기록 화면의 목표 달성 표시도 함께 사라진다"
    assert_equal @other.points, summary.points_total
    assert_equal @other.points, PointEvent.effective.where(activity_date: @date).sum(:points)
  end

  test "keeps the bonus untouched on a day that never had one" do
    result = Tasks::Complete.call(
      task_template_id: @task.id, source_device: @device, idempotency_key: "revert-no-bonus-1", now: @now
    )
    summary = DailySummary.find_by(date: @date)

    _completion, recalculated, changed = Tasks::Revert.call(completion_id: result.completion.id)

    assert changed
    assert_not recalculated.daily_bonus_awarded
    assert_not summary.reload.daily_bonus_awarded
    assert_nil PointEvent.find_by(event_type: "daily_bonus", activity_date: @date)
    assert_equal 0, recalculated.points_total
  end

  test "re-awards the bonus when goals are completed again after a revoke" do
    completion = complete_all!

    Tasks::Revert.call(completion_id: completion.id)
    assert_not DailySummary.find_by(date: @date).daily_bonus_awarded

    # 같은 날 다시 완료하면 보너스가 살아나야 한다(멱등키는 하루 1회 그대로).
    again = Tasks::Complete.call(
      task_template_id: @task.id, source_device: @device, idempotency_key: "revert-reaward", now: @now + 600
    )

    assert again.point_events.any? { |event| event.event_type == "daily_bonus" }, "회수된 보너스는 재완료 시 재지급된다"
    assert DailySummary.find_by(date: @date).daily_bonus_awarded
    assert_equal 1, PointEvent.effective.where(event_type: "daily_bonus", activity_date: @date).count
    assert_equal 15 + 20 + Setting.instance.daily_bonus_points,
      PointEvent.effective.where(activity_date: @date).sum(:points)
  end

  test "reverting twice stays idempotent" do
    completion = complete_all!

    Tasks::Revert.call(completion_id: completion.id)
    _completion, summary, changed = Tasks::Revert.call(completion_id: completion.id)

    assert_not changed
    assert_not summary.daily_bonus_awarded
    assert_equal 1, PointEvent.where(event_type: "daily_bonus", activity_date: @date).count
  end

  private

  # 두 할 일을 모두 채워 일일 보너스를 받은 뒤 첫 할 일의 완료를 돌려준다.
  def complete_all!
    first = Tasks::Complete.call(
      task_template_id: @task.id, source_device: @device, idempotency_key: "revert-all-1", now: @now
    )
    Tasks::Complete.call(
      task_template_id: @other.id, source_device: @device, idempotency_key: "revert-all-2", now: @now + 60
    )
    assert DailySummary.find_by(date: @date).daily_bonus_awarded
    first.completion
  end
end
