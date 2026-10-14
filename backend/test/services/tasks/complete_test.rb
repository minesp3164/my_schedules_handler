require "test_helper"
require "digest"

class Tasks::CompleteTest < ActiveSupport::TestCase
  setup do
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Test device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest("test-token")
    )
    @task = TaskTemplate.create!(user: @user, title: "알고리즘 1문제", points: 15, target_count: 1, position: 0, kind: "algorithm")
    TaskTemplate.create!(user: @user, title: "이력서 개선", points: 20, target_count: 1, position: 1, kind: "portfolio")
    @now = Time.zone.parse("2026-09-11 10:00:00")
  end

  test "creates one completion and its point ledger event" do
    result = Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-001", now: @now)

    assert_equal 1, DailyTaskCompletion.count
    assert_equal 15, PointEvent.effective.sum(:points)
    assert_equal 15, result.daily_summary.points_total
    assert_equal "task_completion", result.point_events.first.event_type
  end

  test "replays an idempotency key without duplicating points" do
    first = Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-002", now: @now)
    replay = Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-002", now: @now)

    assert_equal first.completion.id, replay.completion.id
    assert replay.replayed
    assert_equal 1, DailyTaskCompletion.count
    assert_equal 15, PointEvent.effective.sum(:points)
  end

  test "rejects a completion beyond the daily target" do
    Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-003", now: @now)

    assert_raises(Tasks::Complete::TargetAlreadyMet) do
      Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-004", now: @now)
    end
  end

  test "rejects a task that is not scheduled for today" do
    @task.update!(weekdays: [1])

    assert_raises(Tasks::Complete::InactiveTask) do
      Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-off-day", now: @now)
    end
  end

  test "reverting a completion removes its effective points" do
    result = Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-005", now: @now)
    _completion, summary = Tasks::Revert.call(completion_id: result.completion.id)

    assert_equal 0, PointEvent.effective.sum(:points)
    assert_equal 0, summary.points_total
  end

  test "an application task is rejected without a note" do
    application = TaskTemplate.create!(user: @user, title: "실제 지원", points: 25, target_count: 1, position: 2, kind: "application")

    assert_raises(Tasks::Complete::NoteRequired) do
      Tasks::Complete.call(task_template_id: application.id, source_device: @device, idempotency_key: "complete-app-blank", now: @now)
    end

    assert_equal 0, DailyTaskCompletion.count
    assert_equal 0, PointEvent.effective.sum(:points)
  end

  test "a blank note counts as missing for an application task" do
    application = TaskTemplate.create!(user: @user, title: "실제 지원", points: 25, target_count: 1, position: 2, kind: "application")

    assert_raises(Tasks::Complete::NoteRequired) do
      Tasks::Complete.call(task_template_id: application.id, source_device: @device, idempotency_key: "complete-app-space", note: "   ", now: @now)
    end

    assert_equal 0, DailyTaskCompletion.count
  end

  test "stores the trimmed note on an application completion" do
    application = TaskTemplate.create!(user: @user, title: "실제 지원", points: 25, target_count: 1, position: 2, kind: "application")

    result = Tasks::Complete.call(task_template_id: application.id, source_device: @device, idempotency_key: "complete-app-ok", note: "  네이버  ", now: @now)

    assert_equal "네이버", result.completion.note
    assert_equal 25, PointEvent.effective.sum(:points)
  end

  test "a non-application task still completes without a note" do
    result = Tasks::Complete.call(task_template_id: @task.id, source_device: @device, idempotency_key: "complete-no-note", now: @now)

    assert_nil result.completion.note
    assert_equal 15, PointEvent.effective.sum(:points)
  end

  test "a research task completes without a company note" do
    research = TaskTemplate.create!(user: @user, title: "기업 리서치", points: 10, target_count: 2, position: 3, kind: "research")

    result = Tasks::Complete.call(task_template_id: research.id, source_device: @device, idempotency_key: "complete-research", now: @now)

    assert_nil result.completion.note
    assert_equal 10, PointEvent.effective.sum(:points)
  end

  test "a company picked from the registry marks the note verified with the canonical name" do
    application = TaskTemplate.create!(user: @user, title: "실제 지원", points: 25, target_count: 1, position: 2, kind: "application")
    company = Company.create!(name: "네이버", source: "seed")

    result = Tasks::Complete.call(
      task_template_id: application.id,
      source_device: @device,
      idempotency_key: "complete-app-company",
      note: "네이버(주)",
      company_id: company.id,
      now: @now
    )

    assert_equal "네이버", result.completion.note
    assert result.completion.note_verified
  end

  test "an unknown company id leaves the note unverified" do
    application = TaskTemplate.create!(user: @user, title: "실제 지원", points: 25, target_count: 1, position: 2, kind: "application")

    result = Tasks::Complete.call(
      task_template_id: application.id,
      source_device: @device,
      idempotency_key: "complete-app-bad-company",
      note: "가상회사",
      company_id: "no-such-company",
      now: @now
    )

    assert_equal "가상회사", result.completion.note
    assert_equal false, result.completion.note_verified
  end

  test "a free-typed note is stored unverified" do
    application = TaskTemplate.create!(user: @user, title: "실제 지원", points: 25, target_count: 1, position: 2, kind: "application")

    result = Tasks::Complete.call(
      task_template_id: application.id,
      source_device: @device,
      idempotency_key: "complete-app-free",
      note: "동네사진관",
      now: @now
    )

    assert_equal false, result.completion.note_verified
  end
end
