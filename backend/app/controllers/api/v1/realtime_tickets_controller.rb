module Api
  module V1
    class RealtimeTicketsController < BaseController
      def create
        render json: { data: { ticket: Realtime::Ticket.issue(device: current_device), expires_in: Realtime::Ticket::TTL.to_i } }, status: :created
      end
    end
  end
end
