require "test_helper"
require "digest"

class Tasks::DeferTest < ActiveSupport::TestCase
  setup do
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Defer device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest("defer-token")
    )
    @task = TaskTemplate.create!(
      user: @user, title: "알고리즘", points: 15, target_count: 1, position: 0,
      kind: "algorithm", weekdays: [5]
    )
    @other = TaskTemplate.create!(
      user: @user, title: "이력서", points: 20, target_count: 1, position: 1, kind: "portfolio"
    )
    @date = Date.new(2026, 9, 11) # 금요일(wday 5)
    @now = Time.zone.parse("2026-09-11 21:00:00")
  end

  test "moves an incomplete task to tomorrow and spends the pass" do
    hold = grant_pass!

    result = Tasks::Defer.call(user: @user, task_template_id: @task.id, date: @date, now: @now)

    assert_not result.replayed
    assert_equal @date, result.deferral.from_date
    assert_equal @date + 1, result.deferral.to_date
    assert_equal hold.id, result.redemption.id

    hold.reload
    assert_equal "redeemed", hold.status
    assert_equal @now.to_date, hold.redeemed_at.in_time_zone("Asia/Seoul").to_date
    assert_equal @task.id, hold.payload["task_template_id"]

    assert_not_includes Tasks::Goals.tasks(user: @user, date: @date).map(&:id), @task.id,
      "이월된 할 일은 오늘의 목표에서 빠진다"
    assert_includes Tasks::Goals.tasks(user: @user, date: @date + 1).map(&:id), @task.id,
      "내일은 스케줄(금요일)이 아니어도 목표에 들어온다"
  end

  test "requires an unlocked recovery pass" do
    assert_raises(Tasks::Defer::RecoveryRequired) do
      Tasks::Defer.call(user: @user, task_template_id: @task.id, date: @date, now: @now)
    end

    grant_pass!(status: "skipped")
    assert_raises(Tasks::Defer::RecoveryRequired) do
      Tasks::Defer.call(user: @user, task_template_id: @task.id, date: @date, now: @now)
    end
  end

  test "rejects completed, off-schedule and off-day tasks" do
    grant_pass!

    @other.daily_task_completions.create!(
      source_device: @device, completed_on: @date, sequence: 1, completed_at: @now
    )
    assert_raises(Tasks::Defer::NotEligible) do
      Tasks::Defer.call(user: @user, task_template_id: @other.id, date: @date, now: @now)
    end

    off_day = TaskTemplate.create!(
      user: @user, title: "운동", points: 10, target_count: 1, position: 2,
      kind: "custom", weekdays: [1]
    )
    assert_raises(Tasks::Defer::NotEligible) do
      Tasks::Defer.call(user: @user, task_template_id: off_day.id, date: @date, now: @now)
    end
  end

  test "replays per task and date without duplicating" do
    grant_pass!

    first = Tasks::Defer.call(user: @user, task_template_id: @task.id, date: @date, now: @now)
    replay = Tasks::Defer.call(user: @user, task_template_id: @task.id, date: @date, now: @now + 60)

    assert replay.replayed
    assert_equal first.deferral.id, replay.deferral.id
    assert_equal 1, TaskDeferral.count
    assert_equal 1, @user.reward_redemptions.where(reward_kind: "recovery", status: "redeemed").count
  end

  test "a second task needs a fresh pass" do
    grant_pass!
    Tasks::Defer.call(user: @user, task_template_id: @task.id, date: @date, now: @now)

    assert_raises(Tasks::Defer::RecoveryRequired) do
      Tasks::Defer.call(user: @user, task_template_id: @other.id, date: @date, now: @now)
    end
  end

  test "deferring the last remaining goal awards the daily bonus" do
    @other.daily_task_completions.create!(
      source_device: @device, completed_on: @date, sequence: 1, completed_at: @now
    )
    DailySummary.create!(date: @date, points_total: 20, first_activity_at: @now)
    grant_pass!

    result = Tasks::Defer.call(user: @user, task_template_id: @task.id, date: @date, now: @now)

    assert_not_nil result.bonus_event, "남은 마지막 할 일을 보내면 목표가 채워져 보너스가 난다"
    assert result.daily_summary.daily_bonus_awarded
    assert PointEvent.effective.where(event_type: "daily_bonus", activity_date: @date).exists?
  end

  test "undo removes the deferral and restores the pass" do
    hold = grant_pass!
    result = Tasks::Defer.call(user: @user, task_template_id: @task.id, date: @date, now: @now)

    undo = Tasks::UndoDefer.call(user: @user, id: result.deferral.id, date: @date, now: @now + 300)

    assert_equal 0, TaskDeferral.count
    assert_equal "unlocked", undo.redemption.status
    assert_nil undo.redemption.redeemed_at
    assert_nil undo.redemption.payload["task_template_id"]
    assert_equal hold.id, undo.redemption.id
    assert_includes Tasks::Goals.tasks(user: @user, date: @date).map(&:id), @task.id
  end

  test "undo is rejected once the deferral day has passed" do
    past = TaskDeferral.create!(
      user: @user, task_template: @task, from_date: @date - 1, to_date: @date
    )

    assert_raises(Tasks::UndoDefer::NotUndoable) do
      Tasks::UndoDefer.call(user: @user, id: past.id, date: @date, now: @now)
    end
  end

  private

  def grant_pass!(status: "unlocked")
    @user.reward_redemptions.create!(
      reward_kind: "recovery", status: status, unlocked_at: Time.current
    )
  end
end
