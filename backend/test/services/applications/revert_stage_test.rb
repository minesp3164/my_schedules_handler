require "test_helper"
require "digest"

class Applications::RevertStageTest < ActiveSupport::TestCase
  setup do
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Test device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest("revert-stage-token")
    )
    @stages = Applications::SyncDefaultStages.call(user: @user).index_by(&:kind)
    @application = @user.applications.create!(company: "네이버")
    @task = TaskTemplate.create!(user: @user, title: "실제 지원", points: 25, target_count: 1, position: 0, kind: "application")
    # 일일 보너스가 테스트에 섞이지 않도록 목표를 하나 더 둔다.
    TaskTemplate.create!(user: @user, title: "이력서 개선", points: 20, target_count: 1, position: 1, kind: "portfolio")
    @now = Time.zone.parse("2026-10-13 10:00:00")
  end

  def record(stage, key:)
    Applications::RecordStage.call(
      application_id: @application.id,
      application_stage_id: stage.id,
      source_device: @device,
      idempotency_key: key,
      now: @now
    )
  end

  test "reverting a submission removes its points and the auto-completion together" do
    result = record(@stages["submission"], key: "revert-001")

    reverted = Applications::RevertStage.call(stage_event_id: result.stage_event.id, user: @user)

    assert reverted.changed
    assert_equal 0, PointEvent.effective.sum(:points)
    assert_equal 0, reverted.daily_summary.points_total
    assert_equal 0, DailyTaskCompletion.active.count
    assert result.stage_event.reload.reverted?
  end

  test "reverting twice is a no-op" do
    result = record(@stages["interview"], key: "revert-002")
    Applications::RevertStage.call(stage_event_id: result.stage_event.id, user: @user)

    again = Applications::RevertStage.call(stage_event_id: result.stage_event.id, user: @user)

    assert_not again.changed
    assert_equal 0, PointEvent.effective.sum(:points)
  end

  test "reverting a pass restores active status" do
    result = record(@stages["pass"], key: "revert-003")
    assert_equal "accepted", @application.reload.status

    reverted = Applications::RevertStage.call(stage_event_id: result.stage_event.id, user: @user)

    assert_equal "active", reverted.application.status
  end

  test "reverting a pass keeps a manual rejection" do
    result = record(@stages["pass"], key: "revert-004")
    @application.update!(status: "rejected", closed_at: Time.current)

    reverted = Applications::RevertStage.call(stage_event_id: result.stage_event.id, user: @user)

    assert_equal "rejected", reverted.application.status
  end

  test "another user cannot revert a foreign stage event" do
    result = record(@stages["interview"], key: "revert-005")
    other_user = User.create!

    assert_raises(ActiveRecord::RecordNotFound) do
      Applications::RevertStage.call(stage_event_id: result.stage_event.id, user: other_user)
    end
  end
end
