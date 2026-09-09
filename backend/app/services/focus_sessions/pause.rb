module FocusSessions
  class Pause
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
        return @focus_session if @focus_session.paused?
        raise InvalidState unless @focus_session.running?

        @focus_session.update!(status: "paused", paused_at: @now)
      end
      @focus_session
    end
  end
end
