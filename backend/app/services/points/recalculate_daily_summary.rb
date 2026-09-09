module Points
  class RecalculateDailySummary
    def self.call(date:, first_activity_at: nil)
      summary = DailySummary.find_or_initialize_by(date: date)
      summary.points_total = PointEvent.effective.where(activity_date: date).sum(:points)
      summary.first_activity_at ||= first_activity_at
      summary.save!
      summary
    end
  end
end
