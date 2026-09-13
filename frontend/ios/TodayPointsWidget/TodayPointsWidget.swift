import SwiftUI
import WidgetKit

private let appGroup = "group.com.minesp.shcedule-handler"
private let pointsKey = "today_points"

struct TodayPointsEntry: TimelineEntry {
  let date: Date
  let points: Int
}

struct TodayPointsProvider: TimelineProvider {
  private func entry() -> TodayPointsEntry {
    let points = UserDefaults(suiteName: appGroup)?.integer(forKey: pointsKey) ?? 0
    return TodayPointsEntry(date: Date(), points: points)
  }

  func placeholder(in context: Context) -> TodayPointsEntry {
    TodayPointsEntry(date: Date(), points: 70)
  }

  func getSnapshot(in context: Context, completion: @escaping (TodayPointsEntry) -> Void) {
    completion(entry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TodayPointsEntry>) -> Void) {
    let current = entry()
    let nextRefresh = Calendar.current.startOfDay(for: Date().addingTimeInterval(86_400))
    completion(Timeline(entries: [current], policy: .after(nextRefresh)))
  }
}

struct TodayPointsWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: TodayPointsEntry

  var body: some View {
    Group {
      switch family {
      case .accessoryCircular:
        Gauge(value: Double(min(entry.points, 100)), in: 0...100) {
          Text("P")
        } currentValueLabel: {
          Text("\(entry.points)")
        }
        .gaugeStyle(.accessoryCircular)
      default:
        VStack(alignment: .leading, spacing: 2) {
          Text("TODAY")
            .font(.caption2)
            .foregroundStyle(.secondary)
          Text("\(entry.points) P")
            .font(.title2.bold())
          Text("오늘 쌓은 포인트")
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
      }
    }
    .widgetURL(URL(string: "tracker://widget"))
  }
}

struct TodayPointsWidget: Widget {
  let kind = "TodayPointsWidget"

  var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayPointsProvider()) { entry in
            TodayPointsWidgetView(entry: entry)
        }
    .configurationDisplayName("오늘의 포인트")
    .description("오늘 획득한 포인트를 확인합니다.")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .systemSmall])
  }
}
