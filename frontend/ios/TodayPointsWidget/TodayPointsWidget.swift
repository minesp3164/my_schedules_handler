import ActivityKit
import SwiftUI
import WidgetKit

private let appGroup = "group.com.minesp.tracker"
private let pointsKey = "today_points"
private let themeButtonKey = "theme_button"

private func themeChannels(_ key: String) -> (red: Double, green: Double, blue: Double)? {
  guard let value = UserDefaults(suiteName: appGroup)?.string(forKey: key) else { return nil }
  let hex = value.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
  guard hex.count == 6, let number = UInt64(hex, radix: 16) else { return nil }

  return (
    red: Double((number >> 16) & 0xFF) / 255,
    green: Double((number >> 8) & 0xFF) / 255,
    blue: Double(number & 0xFF) / 255
  )
}

private func colorFromTheme(_ key: String, fallback: Color) -> Color {
  guard let channels = themeChannels(key) else { return fallback }
  return Color(red: channels.red, green: channels.green, blue: channels.blue)
}

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

@available(iOS 16.2, *)
private struct FocusGlyph: View {
  let endDate: Date
  let totalSeconds: Double
  let isPaused: Bool
  let color: Color
  let size: CGFloat
  var showsTimeInside = false

  private var startDate: Date {
    endDate.addingTimeInterval(-max(totalSeconds, 1))
  }

  var body: some View {
    ZStack {
      if isPaused {
        Circle()
          .stroke(color.opacity(0.25), lineWidth: max(size * 0.09, 2))
      } else {
        ProgressView(timerInterval: startDate...endDate, countsDown: true) {
          EmptyView()
        } currentValueLabel: {
          EmptyView()
        }
          .labelsHidden()
          .progressViewStyle(.circular)
          .tint(color)
          .scaleEffect(size / 22)
      }
      if isPaused {
        Image(systemName: "pause.fill")
          .font(.system(size: size * 0.3, weight: .semibold))
          .foregroundStyle(color)
      } else if showsTimeInside {
        Text(timerInterval: min(.now, endDate)...endDate, countsDown: true)
          .font(.system(size: size * 0.4, weight: .semibold).monospacedDigit())
          .foregroundStyle(color)
          .tint(color)
          .minimumScaleFactor(0.5)
          .lineLimit(1)
      } else {
        Image(systemName: "timer")
          .font(.system(size: size * 0.3, weight: .semibold))
          .foregroundStyle(color)
      }
    }
    .frame(width: size, height: size)
  }
}

@available(iOS 16.2, *)
struct FocusLiveActivityWidget: Widget {
  private var accentColor: Color {
    colorFromTheme(themeButtonKey, fallback: .mint)
  }

  private var backgroundColor: Color {
    Color(red: 0.93, green: 0.96, blue: 0.94)
  }

  var body: some WidgetConfiguration {
    ActivityConfiguration(for: FocusLiveActivityAttributes.self) { context in
      VStack(alignment: .leading, spacing: 10) {
        HStack(spacing: 12) {
          FocusGlyph(
            endDate: context.state.endDate,
            totalSeconds: Double(context.attributes.plannedSeconds),
            isPaused: context.state.isPaused,
            color: accentColor,
            size: 34,
            showsTimeInside: true
          )
          VStack(alignment: .leading, spacing: 2) {
            Text(context.attributes.title)
              .font(.headline)
              .foregroundStyle(accentColor)
            Text(context.state.isPaused ? "일시정지됨" : "집중 중")
              .font(.caption)
              .foregroundStyle(accentColor.opacity(0.7))
          }
          .offset(x: 24)
          Spacer()
        }
      }
      .padding(.horizontal)
      .padding(.vertical, 4)
      .activityBackgroundTint(backgroundColor)
      .activitySystemActionForegroundColor(accentColor)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          FocusGlyph(
            endDate: context.state.endDate,
            totalSeconds: Double(context.attributes.plannedSeconds),
            isPaused: context.state.isPaused,
            color: accentColor,
            size: 34,
            showsTimeInside: true
          )
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(context.state.isPaused ? "일시정지" : "집중 중")
            .font(.caption.bold())
            .foregroundStyle(accentColor)
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text(context.state.isPaused ? "집중을 다시 시작해보세요" : context.attributes.title)
            .font(.caption)
            .foregroundStyle(accentColor.opacity(0.7))
        }
      } compactLeading: {
        FocusGlyph(
          endDate: context.state.endDate,
          totalSeconds: Double(context.attributes.plannedSeconds),
          isPaused: context.state.isPaused,
          color: accentColor,
          size: 20
        )
      } compactTrailing: {
        FocusGlyph(
          endDate: context.state.endDate,
          totalSeconds: Double(context.attributes.plannedSeconds),
          isPaused: context.state.isPaused,
          color: accentColor,
          size: 20
        )
      } minimal: {
        FocusGlyph(
          endDate: context.state.endDate,
          totalSeconds: Double(context.attributes.plannedSeconds),
          isPaused: context.state.isPaused,
          color: accentColor,
          size: 20
        )
      }
    }
  }
}
