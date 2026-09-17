class FinalizeFocusSessionJob < ApplicationJob
  queue_as :notifications

  def perform(focus_session_id)
    FocusSessions::AutoComplete.call(focus_session_id: focus_session_id)
  end
end
