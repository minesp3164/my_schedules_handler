module Realtime
  class Publish
    Result = Data.define(:revision, :event, :occurred_at)

    def self.call(...)
      new(...).call
    end

    def self.current_revision
      Setting.instance.sync_revision
    end

    def initialize(event:, data: {})
      @event = event
      @data = data
    end

    def call
      revision = Setting.transaction do
        setting = Setting.lock.find(Setting::SINGLETON_ID)
        setting.update!(sync_revision: setting.sync_revision + 1)
        setting.sync_revision
      end
      occurred_at = Time.current
      ActionCable.server.broadcast("tracker", {
        event: @event,
        revision: revision,
        occurred_at: occurred_at.iso8601,
        data: @data
      })
      Result.new(revision, @event, occurred_at)
    end
  end
end
