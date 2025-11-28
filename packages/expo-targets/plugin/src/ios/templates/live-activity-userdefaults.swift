// Live Activity with UserDefaults Data Loading
// This template shows how to load data from App Group storage

import ActivityKit
import WidgetKit
import SwiftUI

// Helper to load data from UserDefaults
struct ActivityData: Codable {
    var status: String
    var message: String
    var timestamp: Double
    
    static func load(from appGroup: String, activityId: String) -> ActivityData? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let data = defaults.dictionary(forKey: "\(activityId)_contentState") else {
            return nil
        }
        
        let status = data["status"] as? String ?? "Unknown"
        let message = data["message"] as? String ?? ""
        let timestamp = data["timestamp"] as? Double ?? Date().timeIntervalSince1970
        
        return ActivityData(status: status, message: message, timestamp: timestamp)
    }
}

@available(iOS 16.1, *)
struct {{ACTIVITY_NAME}}LiveActivity: Widget {
    let appGroup = "{{APP_GROUP}}"
    let activityId = "{{ACTIVITY_ID}}"
    
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: {{ACTIVITY_NAME}}Attributes.self) { context in
            // Load latest data from UserDefaults
            let data = ActivityData.load(from: appGroup, activityId: activityId)
            
            // Lock screen/banner UI
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(context.attributes.name)
                        .font(.headline)
                    Spacer()
                    Text(data?.status ?? context.state.status)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Text(data?.message ?? context.state.message)
                    .font(.body)
                
                if let data = data {
                    Text("Updated \(formatTimestamp(data.timestamp))")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .activityBackgroundTint(Color.cyan.opacity(0.2))
            .activitySystemActionForegroundColor(Color.black)
        } dynamicIsland: { context in
            let data = ActivityData.load(from: appGroup, activityId: activityId)
            
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                        Text(context.attributes.name)
                            .font(.caption)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    Text(data?.status ?? context.state.status)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                DynamicIslandExpandedRegion(.center) {
                    Text(data?.message ?? context.state.message)
                        .font(.body)
                        .lineLimit(3)
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Button(action: {}) {
                            Label("Action", systemImage: "checkmark.circle.fill")
                        }
                        .buttonStyle(.borderedProminent)
                        
                        Spacer()
                    }
                    .padding(.top, 8)
                }
            } compactLeading: {
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
            } compactTrailing: {
                Text(data?.status ?? context.state.status)
                    .font(.caption2)
            } minimal: {
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
            }
            .widgetURL(URL(string: "myapp://activity/\(context.attributes.name)"))
            .keylineTint(Color.cyan)
        }
    }
    
    private func formatTimestamp(_ timestamp: Double) -> String {
        let date = Date(timeIntervalSince1970: timestamp)
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}
