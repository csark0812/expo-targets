import ActivityKit
import WidgetKit
import SwiftUI

@available(iOS 16.1, *)
struct TimerActivityLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TimerActivityAttributes.self) { context in
            // Lock screen UI
            VStack(spacing: 12) {
                HStack {
                    Image(systemName: "timer")
                        .font(.title2)
                        .foregroundColor(Color("AccentColor"))
                    Text(context.attributes.timerName)
                        .font(.headline)
                    Spacer()
                    if context.state.isRunning {
                        Image(systemName: "waveform")
                            .font(.caption)
                            .foregroundColor(Color("AccentColor"))
                    }
                }
                
                VStack(spacing: 4) {
                    Text(formatTime(context.state.remainingSeconds))
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .monospacedDigit()
                    
                    ProgressView(value: Double(context.state.progress), total: 100)
                        .tint(Color("AccentColor"))
                }
            }
            .padding()
            .activityBackgroundTint(Color.orange.opacity(0.1))
            .activitySystemActionForegroundColor(Color.orange)
            
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading) {
                        Image(systemName: "timer")
                            .font(.title2)
                            .foregroundColor(Color("AccentColor"))
                        Text(context.attributes.timerName)
                            .font(.caption)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    VStack {
                        Text("\(context.state.progress)%")
                            .font(.title3)
                            .bold()
                        Text("Complete")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                DynamicIslandExpandedRegion(.center) {
                    VStack {
                        Text(formatTime(context.state.remainingSeconds))
                            .font(.system(size: 40, weight: .bold, design: .rounded))
                            .monospacedDigit()
                        
                        ProgressView(value: Double(context.state.progress), total: 100)
                            .tint(Color("AccentColor"))
                            .frame(maxWidth: 200)
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        if context.state.isRunning {
                            Button(action: {}) {
                                Label("Pause", systemImage: "pause.fill")
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        }
                        
                        Spacer()
                        
                        Button(action: {}) {
                            Label("Cancel", systemImage: "xmark")
                        }
                        .buttonStyle(.bordered)
                        .tint(.red)
                        .controlSize(.small)
                    }
                }
                
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundColor(Color("AccentColor"))
                
            } compactTrailing: {
                Text(formatTimeCompact(context.state.remainingSeconds))
                    .font(.caption2)
                    .bold()
                    .monospacedDigit()
                
            } minimal: {
                Image(systemName: "timer")
                    .foregroundColor(Color("AccentColor"))
            }
            .widgetURL(URL(string: "liveactivitydemo://timer"))
            .keylineTint(Color("AccentColor"))
        }
    }
    
    private func formatTime(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        } else {
            return String(format: "%d:%02d", minutes, secs)
        }
    }
    
    private func formatTimeCompact(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", minutes, secs)
    }
}
