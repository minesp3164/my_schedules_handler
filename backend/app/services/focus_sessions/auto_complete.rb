module FocusSessions
  class AutoComplete
    NOTIFICATION_TYPE = "focus_live_activity_end"

    def self.call(...)
      new(...).call
    end

    def initialize(focus_session_id:, now: Time.current, client: Notifications::PushClient.new)
      @focus_session_id = focus_session_id
      @now = now
      @client = client
    end

    def call
      session = FocusSession.find_by(id: @focus_session_id)
      return unless session
      return if session.paused?
      return if session.running? && session.scheduled_end_at > @now

      result = complete(session) if session.running?
      deliver_live_activity_end(session)
      result
    end

    private

    def complete(session)
      result = Complete.call(
        focus_session: session,
        idempotency_key: "auto-complete-#{session.id}",
        ended_at: session.scheduled_end_at
      )
      return result if result.replayed

      Realtime::Publish.call(event: "focus.completed", data: { focus_session_id: session.id })
      result.reward_achievements.each { |achievement| SendRewardNotificationJob.perform_later(achievement.id) }
      result
    end

    def deliver_live_activity_end(session)
      device = session.source_device
      return unless device.expo_push_token.present?

      Notifications::Deliver.call(
        device: device,
        notification_type: NOTIFICATION_TYPE,
        schedule_key: session.id,
        title: session.break? ? "휴식 시간 종료" : "집중 시간 종료",
        body: session.break? ? "휴식이 끝났어요." : "집중 타이머가 끝났어요.",
        data: { type: NOTIFICATION_TYPE, focus_session_id: session.id },
        silent: true,
        client: @client
      )
    end
  end
end
