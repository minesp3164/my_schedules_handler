module FocusSessions
  class Cancel
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
        return @focus_session if @focus_session.cancelled?
        raise InvalidState unless @focus_session.running? || @focus_session.paused?

        @focus_session.update!(status: "cancelled", ended_at: @now, active_lock: nil, paused_at: nil)
      end
      @focus_session
    end
  end
end
