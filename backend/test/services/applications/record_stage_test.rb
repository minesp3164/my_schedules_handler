require "test_helper"
require "digest"

class Applications::RecordStageTest < ActiveSupport::TestCase
  setup do
    @user = User.create!
    @device = Device.create!(
      user: @user,
      installation_id: SecureRandom.uuid,
      name: "Test device",
      platform: "web",
      access_token_digest: Digest::SHA256.hexdigest("record-stage-token")
    )
    @stages = Applications::SyncDefaultStages.call(user: @user).index_by(&:kind)
    @application = @user.applications.create!(company: "네이버")
    @task = TaskTemplate.create!(user: @user, title: "실제 지원", points: 25, target_count: 1, position: 0, kind: "application")
    # 일일 보너스가 테스트에 섞이지 않도록 목표를 하나 더 둔다.
    TaskTemplate.create!(user: @user, title: "이력서 개선", points: 20, target_count: 1, position: 1, kind: "portfolio")
    @now = Time.zone.parse("2026-10-13 10:00:00")
  end

  def record(stage, key:, application: @application)
    Applications::RecordStage.call(
      application_id: application.id,
      application_stage_id: stage.id,
      source_device: @device,
      idempotency_key: key,
      now: @now
    )
  end

  test "a submission stage pays milestone points and auto-completes the application task" do
    result = record(@stages["submission"], key: "record-001")

    assert_equal "application_milestone", result.point_events.first.event_type
    assert_equal 25, PointEvent.effective.where(event_type: "application_milestone").sum(:points)
    # 자동 완료는 원장 이벤트를 만들지 않는다(포인트는 단계에서만).
    assert_equal 1, DailyTaskCompletion.active.count
    assert_equal 0, PointEvent.effective.where(event_type: "task_completion").count
    assert_equal @application.id, result.completion.application_stage_event.application.id
  end

  test "a submission auto-completion keeps the company note with registry verification" do
    company = Company.create!(name: "네이버", source: "seed")

    record(@stages["submission"], key: "record-verified")

    completion = DailyTaskCompletion.last
    assert_equal "네이버", completion.note
    assert completion.note_verified
    assert_equal company.id, Company.find_by(normalized_name: Company.normalize_name("네이버")).id
  end

  test "interview and pass stages pay their fixed points and pass marks the application accepted" do
    record(@stages["submission"], key: "record-full-a")
    record(@stages["interview"], key: "record-interview")
    result = record(@stages["pass"], key: "record-pass")

    assert_equal 25 + 30 + 100, PointEvent.effective.where(event_type: "application_milestone").sum(:points)
    assert_equal "accepted", result.application.status
  end

  test "replays an idempotency key without duplicating points" do
    first = record(@stages["submission"], key: "record-replay")
    replay = record(@stages["submission"], key: "record-replay")

    assert replay.replayed
    assert_equal first.stage_event.id, replay.stage_event.id
    assert_equal 25, PointEvent.effective.where(event_type: "application_milestone").sum(:points)
    assert_equal 1, DailyTaskCompletion.active.count
  end

  test "rejects the same stage twice for one application" do
    record(@stages["interview"], key: "record-dup-a")

    assert_raises(Applications::RecordStage::StageAlreadyRecorded) do
      record(@stages["interview"], key: "record-dup-b")
    end
  end

  test "a second submission stage cannot farm points for one application" do
    extra = @user.application_stages.create!(name: "추가 제출", kind: "submission", position: 9)
    record(@stages["submission"], key: "record-farm-a")

    assert_raises(Applications::RecordStage::StageAlreadyRecorded) do
      record(extra, key: "record-farm-b")
    end
  end

  test "interview stages can repeat through separate stage definitions" do
    second_round = @user.application_stages.create!(name: "2차 면접", kind: "interview", position: 5)

    record(@stages["interview"], key: "record-round-1")
    record(second_round, key: "record-round-2")

    assert_equal 30 + 30, PointEvent.effective.where(event_type: "application_milestone").sum(:points)
  end

  test "a closed application rejects new stages" do
    @application.update!(status: "rejected", closed_at: Time.current)

    assert_raises(Applications::RecordStage::ApplicationClosed) do
      record(@stages["submission"], key: "record-closed")
    end
  end

  test "an inactive stage rejects new recordings" do
    @stages["interview"].update!(active: false)

    assert_raises(Applications::RecordStage::InactiveStage) do
      record(@stages["interview"], key: "record-inactive")
    end
  end

  test "stage points are granted even when no application task is scheduled" do
    @task.update!(weekdays: [0]) # 오늘이 스케줄이 아닌 날

    result = record(@stages["submission"], key: "record-no-task")

    assert_equal 25, PointEvent.effective.sum(:points)
    assert_nil result.completion
    assert_equal 0, DailyTaskCompletion.count
  end

  test "the daily target still caps auto-completions across companies" do
    other = @user.applications.create!(company: "카카오")

    record(@stages["submission"], key: "record-target-a")
    record(@stages["submission"], key: "record-target-b", application: other)

    assert_equal 2, PointEvent.effective.where(event_type: "application_milestone").count
    assert_equal 1, DailyTaskCompletion.active.count
  end

  test "a submission that completes the only goal awards the daily bonus" do
    TaskTemplate.where(user: @user, kind: "portfolio").destroy_all # 목표를 하나로 줄여 보너스 발화를 유도한다
    result = record(@stages["submission"], key: "record-bonus-a")

    assert DailySummary.find_by(date: @now.to_date).daily_bonus_awarded?
    assert_includes result.point_events.map(&:event_type), "daily_bonus"
    # 제출 단계 25 + 일일 보너스 30. 할 일 점수는 중복 지급되지 않는다.
    assert_equal 25 + 30, PointEvent.effective.sum(:points)
  end

  test "the bonus is awarded only once across stage recordings" do
    TaskTemplate.where(user: @user, kind: "portfolio").destroy_all
    record(@stages["submission"], key: "record-bonus-b")
    result = record(@stages["interview"], key: "record-bonus-c")

    assert_equal 1, PointEvent.effective.where(event_type: "daily_bonus").count
    assert_not_includes result.point_events.map(&:event_type), "daily_bonus"
  end
end
