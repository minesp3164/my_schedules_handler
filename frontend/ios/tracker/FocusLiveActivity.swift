import ActivityKit
import Foundation

@objc(FocusLiveActivity)
final class FocusLiveActivity: NSObject {
  @objc(status:rejecter:)
  func status(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve("unsupported")
      return
    }

    resolve(ActivityAuthorizationInfo().areActivitiesEnabled ? "enabled" : "disabled")
  }

  @objc(refresh:rejecter:)
  func refresh(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(nil)
      return
    }

    Task {
      for activity in Activity<FocusLiveActivityAttributes>.activities {
        await activity.update(activity.content)
      }
      resolve(nil)
    }
  }

  @objc(start:endAt:title:resolver:rejecter:)
  func start(
    _ plannedSeconds: NSNumber,
    endAt: NSNumber,
    title: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(nil)
      return
    }

    Task {
      for existing in Activity<FocusLiveActivityAttributes>.activities {
        await existing.end(nil, dismissalPolicy: .immediate)
      }
      do {
        let activity = try Activity<FocusLiveActivityAttributes>.request(
          attributes: FocusLiveActivityAttributes(title: title, plannedSeconds: plannedSeconds.intValue),
          content: ActivityContent(
            state: FocusLiveActivityAttributes.ContentState(
              endDate: Date(timeIntervalSince1970: endAt.doubleValue / 1000),
              isPaused: false
            ),
            staleDate: nil
          ),
          pushType: nil
        )
        resolve(activity.id)
      } catch {
        reject("FOCUS_LIVE_ACTIVITY_START_FAILED", error.localizedDescription, error)
      }
    }
  }

  @objc(update:remainingSeconds:paused:resolver:rejecter:)
  func update(
    _ activityId: String,
    remainingSeconds: NSNumber,
    paused: Bool,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(nil)
      return
    }

    Task {
      guard let activity = Activity<FocusLiveActivityAttributes>.activities.first(where: { $0.id == activityId }) else {
        resolve(nil)
        return
      }

      let content = ActivityContent(
        state: FocusLiveActivityAttributes.ContentState(
          endDate: Date().addingTimeInterval(remainingSeconds.doubleValue),
          isPaused: paused
        ),
        staleDate: nil
      )
      await activity.update(content)
      resolve(nil)
    }
  }

  @objc(end:resolver:rejecter:)
  func end(
    _ activityId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(nil)
      return
    }

    Task {
      guard let activity = Activity<FocusLiveActivityAttributes>.activities.first(where: { $0.id == activityId }) else {
        resolve(nil)
        return
      }

      await activity.end(nil, dismissalPolicy: .immediate)
      resolve(nil)
    }
  }
}
