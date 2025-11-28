// Live Activity Widget
// Provides UI for Dynamic Island and Lock Screen

import ActivityKit
import WidgetKit
import SwiftUI

@available(iOS 16.1, *)
struct {{ACTIVITY_NAME}}LiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: {{ACTIVITY_NAME}}Attributes.self) { context in
            // Lock screen/banner UI
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(context.attributes.name)
                        .font(.headline)
                    Spacer()
                    Text(context.state.status)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Text(context.state.message)
                    .font(.body)
            }
            .padding()
            .activityBackgroundTint(Color.cyan.opacity(0.2))
            .activitySystemActionForegroundColor(Color.black)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI - shown when user long-presses the Dynamic Island
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                        Text(context.attributes.name)
                            .font(.caption)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.status)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.message)
                        .font(.body)
                        .lineLimit(3)
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Button(action: {
                            // Handle button action
                        }) {
                            Label("Action", systemImage: "checkmark.circle.fill")
                        }
                        .buttonStyle(.borderedProminent)
                        
                        Spacer()
                    }
                    .padding(.top, 8)
                }
            } compactLeading: {
                // Compact leading - left side of the Dynamic Island
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
            } compactTrailing: {
                // Compact trailing - right side of the Dynamic Island
                Text(context.state.status)
                    .font(.caption2)
            } minimal: {
                // Minimal - shown when multiple activities are active
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
            }
            .widgetURL(URL(string: "myapp://activity/\(context.attributes.name)"))
            .keylineTint(Color.cyan)
        }
    }
}
