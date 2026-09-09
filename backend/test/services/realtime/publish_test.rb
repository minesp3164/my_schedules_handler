require "test_helper"
require "action_cable/test_helper"

class Realtime::PublishTest < ActiveSupport::TestCase
  include ActionCable::TestHelper

  test "broadcasts an event with an increasing global revision" do
    Setting.instance

    assert_broadcasts "tracker", 1 do
      @first = Realtime::Publish.call(event: "task.completed", data: { completion_id: "completion-1" })
    end
    assert_broadcasts "tracker", 1 do
      @second = Realtime::Publish.call(event: "focus.completed", data: { focus_session_id: "focus-1" })
    end

    assert_equal @first.revision + 1, @second.revision
    assert_equal @second.revision, Realtime::Publish.current_revision
    payload = JSON.parse(broadcasts("tracker").last)
    assert_equal "focus.completed", payload.fetch("event")
    assert_equal "focus-1", payload.dig("data", "focus_session_id")
  end
end
