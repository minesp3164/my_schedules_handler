import Foundation
import WidgetKit

@objc(TodayPointsWidget)
final class TodayPointsWidget: NSObject {
  private let appGroup = "group.com.minesp.shcedule-handler"
  private let pointsKey = "today_points"
  private let updatedAtKey = "today_points_updated_at"

  @objc(setTodayPoints:)
  func setTodayPoints(_ points: NSNumber) {
    let defaults = UserDefaults(suiteName: appGroup)
    defaults?.set(points.intValue, forKey: pointsKey)
    defaults?.set(Date().timeIntervalSince1970, forKey: updatedAtKey)
    WidgetCenter.shared.reloadTimelines(ofKind: "TodayPointsWidget")
  }
}
