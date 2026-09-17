import SwiftUI
import WidgetKit

@main
struct TodayPointsWidgetBundle: WidgetBundle {
  var body: some Widget {
    TodayPointsWidget()
    if #available(iOS 16.2, *) {
      FocusLiveActivityWidget()
    }
  }
}
