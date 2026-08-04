import ActivityKit
import ExpoModulesCore

/// Mirrors TrickActivityAttributes in the widget extension (must stay in sync).
struct TrickActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var status: String
  }

  var title: String
}

public class TrickLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TrickLiveActivity")

    AsyncFunction("start") { (title: String, status: String) -> String in
      guard #available(iOS 16.2, *) else {
        throw NSError(
          domain: "TrickLiveActivity",
          code: 16,
          userInfo: [NSLocalizedDescriptionKey: "Live Activities require iOS 16.2+"]
        )
      }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        throw NSError(
          domain: "TrickLiveActivity",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Live Activities disabled in Settings"]
        )
      }
      let attributes = TrickActivityAttributes(title: title)
      let state = TrickActivityAttributes.ContentState(status: status)
      let activity = try Activity.request(
        attributes: attributes,
        content: .init(state: state, staleDate: nil),
        pushType: nil
      )
      return activity.id
    }

    AsyncFunction("update") { (activityId: String, status: String) -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      guard let activity = Activity<TrickActivityAttributes>.activities.first(where: {
        $0.id == activityId
      }) else {
        return false
      }
      let state = TrickActivityAttributes.ContentState(status: status)
      await activity.update(.init(state: state, staleDate: nil))
      return true
    }

    AsyncFunction("endAll") { () in
      guard #available(iOS 16.2, *) else { return }
      for activity in Activity<TrickActivityAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
  }
}
