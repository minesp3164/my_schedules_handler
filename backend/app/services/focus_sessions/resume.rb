module FocusSessions
  class Resume
    class InvalidState < StandardError; end

    def self.call(...)
      new(...).call
    end

    def initialize(focus_session:, now: Time.current)
      @focus_session = focus_session
      @now = now
    end

    def call
      @focus_session.with_lock do
        return @focus_session if @focus_session.running?
        raise InvalidState unless @focus_session.paused?

        added_pause_seconds = (@now - @focus_session.paused_at).floor
        @focus_session.update!(
          status: "running",
          paused_at: nil,
          paused_seconds: @focus_session.paused_seconds + added_pause_seconds
        )
      end
      @focus_session
    end
  end
end
