import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Activity Attributes

struct ScoreActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic data that changes during the Live Activity
        var score: Int
        var status: String
        var lastUpdate: Date
    }
    
    // Static data that doesn't change
    var gameName: String
    var teamName: String
}

// MARK: - Live Activity Widget

@main
struct ScoreActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ScoreActivityAttributes.self) { context in
            // Lock screen/banner UI
            LiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        Image(systemName: "trophy.fill")
                            .foregroundColor(Color("AccentColor"))
                            .font(.title2)
                        
                        Text(context.attributes.teamName)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("\(context.state.score)")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(Color("ScoreColor"))
                        
                        Text("SCORE")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 4) {
                        Text(context.state.status)
                            .font(.body)
                            .fontWeight(.semibold)
                            .foregroundColor(Color("TextPrimary"))
                        
                        Text(context.state.lastUpdate, style: .time)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Image(systemName: "figure.run")
                        Text(context.attributes.gameName)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                }
            } compactLeading: {
                // Compact leading (left side of Dynamic Island)
                Image(systemName: "trophy.fill")
                    .foregroundColor(Color("AccentColor"))
            } compactTrailing: {
                // Compact trailing (right side of Dynamic Island)
                Text("\(context.state.score)")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(Color("ScoreColor"))
            } minimal: {
                // Minimal presentation (when multiple Live Activities are active)
                Image(systemName: "trophy.fill")
                    .foregroundColor(Color("AccentColor"))
            }
        }
    }
}

// MARK: - Views

struct LiveActivityView: View {
    let context: ActivityViewContext<ScoreActivityAttributes>
    
    var body: some View {
        HStack(spacing: 16) {
            // Left side - Icon and team info
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: "trophy.fill")
                        .foregroundColor(Color("AccentColor"))
                        .font(.title2)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.attributes.teamName)
                            .font(.headline)
                            .foregroundColor(Color("TextPrimary"))
                        
                        Text(context.attributes.gameName)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Text(context.state.status)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Right side - Score
            VStack(spacing: 4) {
                Text("\(context.state.score)")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundColor(Color("ScoreColor"))
                
                Text("SCORE")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                
                Text(context.state.lastUpdate, style: .time)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .activityBackgroundTint(Color("BackgroundColor"))
        .activitySystemActionForegroundColor(Color("TextPrimary"))
    }
}

// MARK: - Previews

#Preview("Live Activity", as: .content, using: ScoreActivityAttributes(
    gameName: "Championship Game",
    teamName: "Blue Team"
)) {
    ScoreActivity()
} contentStates: {
    ScoreActivityAttributes.ContentState(score: 0, status: "Game Starting", lastUpdate: Date())
    ScoreActivityAttributes.ContentState(score: 15, status: "In Progress", lastUpdate: Date())
    ScoreActivityAttributes.ContentState(score: 42, status: "Final Quarter", lastUpdate: Date())
    ScoreActivityAttributes.ContentState(score: 100, status: "Game Complete", lastUpdate: Date())
}

#Preview("Dynamic Island Compact", as: .dynamicIsland(.compact), using: ScoreActivityAttributes(
    gameName: "Championship",
    teamName: "Blue Team"
)) {
    ScoreActivity()
} contentStates: {
    ScoreActivityAttributes.ContentState(score: 42, status: "In Progress", lastUpdate: Date())
}

#Preview("Dynamic Island Expanded", as: .dynamicIsland(.expanded), using: ScoreActivityAttributes(
    gameName: "Championship",
    teamName: "Blue Team"
)) {
    ScoreActivity()
} contentStates: {
    ScoreActivityAttributes.ContentState(score: 75, status: "Final Quarter", lastUpdate: Date())
}

#Preview("Dynamic Island Minimal", as: .dynamicIsland(.minimal), using: ScoreActivityAttributes(
    gameName: "Championship",
    teamName: "Blue Team"
)) {
    ScoreActivity()
} contentStates: {
    ScoreActivityAttributes.ContentState(score: 20, status: "In Progress", lastUpdate: Date())
}
