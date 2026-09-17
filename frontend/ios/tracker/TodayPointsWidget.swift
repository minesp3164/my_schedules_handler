import Foundation
import WidgetKit

@objc(TodayPointsWidget)
final class TodayPointsWidget: NSObject {
  private let appGroup = "group.com.minesp.tracker"
  private let pointsKey = "today_points"
  private let updatedAtKey = "today_points_updated_at"
  private let themeButtonKey = "theme_button"
  private let themeBackgroundKey = "theme_background"

  @objc(setTodayPoints:)
  func setTodayPoints(_ points: NSNumber) {
    let defaults = UserDefaults(suiteName: appGroup)
    defaults?.set(points.intValue, forKey: pointsKey)
    defaults?.set(Date().timeIntervalSince1970, forKey: updatedAtKey)
    WidgetCenter.shared.reloadTimelines(ofKind: "TodayPointsWidget")
  }

  @objc(setThemeButton:background:)
  func setTheme(button: String, background: String) {
    let defaults = UserDefaults(suiteName: appGroup)
    defaults?.set(button, forKey: themeButtonKey)
    defaults?.set(background, forKey: themeBackgroundKey)
    WidgetCenter.shared.reloadAllTimelines()
  }
}
