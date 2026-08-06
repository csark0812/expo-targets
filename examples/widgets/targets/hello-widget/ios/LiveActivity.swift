import ActivityKit
import SwiftUI
import WidgetKit

/// User-owned Live Activity UI — safe to edit; prebuild will not overwrite.
/// Attributes type `HelloWidgetAttributes` is CNG-generated into ios/*/ExpoTargetsGenerated/.
struct HelloWidgetLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: HelloWidgetAttributes.self) { context in
      VStack(alignment: .leading, spacing: 4) {
        Text("Live Activity")
          .font(.headline)
        Text(context.state.status)
          .font(.subheadline)
      }
      .padding()
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          Text(context.state.status)
        }
      } compactLeading: {
        Image(systemName: "circle.fill")
      } compactTrailing: {
        Text("…")
          .font(.caption2)
      } minimal: {
        Image(systemName: "circle.fill")
      }
    }
  }
}
