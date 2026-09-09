class TrackerChannel < ApplicationCable::Channel
  def subscribed
    stream_from "tracker"
  end
end
