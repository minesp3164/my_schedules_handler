require "test_helper"
require "digest"

class Tasks::DeactivateTest < ActiveSupport::TestCase
  setup do
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Test device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest("test-token")
    )
    @task = TaskTemplate.create!(user: @user, title: "독서", points: 15, target_count: 1, position: 0, kind: "custom")
    TaskTemplate.create!(user: @user, title: "운동", points: 10, target_count: 1, position: 1, kind: "custom")
    @now = Time.zone.parse("2026-09-12 10:00:00")
  end

  test "deactivating a completed task reverses its completion points" do
    completion = Tasks::Complete.call(
      task_template_id: @task.id,
      source_device: @device,
      idempotency_key: "complete-before-deactivate",
      now: @now
    ).completion

    result = Tasks::Deactivate.call(task_template_id: @task.id, user: @user)

    assert result.changed
    assert_not result.task.active?
    assert completion.reload.reverted_at.present?
    assert completion.point_event.reload.reversed_at.present?
    assert_equal 0, PointEvent.effective.where(activity_date: @now.to_date).sum(:points)
    assert_equal 0, DailySummary.find(@now.to_date).points_total
  end
end
