import ActivityKit
import Foundation

@available(iOS 16.2, *)
struct FocusLiveActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    let endDate: Date
    let isPaused: Bool
  }

  let title: String
  let plannedSeconds: Int
}
