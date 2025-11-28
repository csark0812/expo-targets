import ActivityKit
import WidgetKit
import SwiftUI

@available(iOS 16.1, *)
struct WorkoutTrackerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutTrackerAttributes.self) { context in
            // Lock screen UI
            VStack(spacing: 8) {
                HStack {
                    Image(systemName: "figure.run")
                        .font(.title2)
                        .foregroundColor(Color("AccentColor"))
                    Text(context.attributes.workoutType)
                        .font(.headline)
                    Spacer()
                    Text(context.state.elapsedTime)
                        .font(.title3)
                        .bold()
                }
                
                HStack {
                    VStack(alignment: .leading) {
                        Text("Distance")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text(context.state.currentDistance)
                            .font(.body)
                            .bold()
                    }
                    Spacer()
                    VStack(alignment: .center) {
                        Text("Pace")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text(context.state.currentPace)
                            .font(.body)
                            .bold()
                    }
                    Spacer()
                    VStack(alignment: .trailing) {
                        Text("Calories")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text("\(context.state.calories)")
                            .font(.body)
                            .bold()
                    }
                }
            }
            .padding()
            .activityBackgroundTint(Color.green.opacity(0.1))
            .activitySystemActionForegroundColor(Color.green)
            
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "figure.run")
                        .font(.title)
                        .foregroundColor(Color("AccentColor"))
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing) {
                        Text(context.state.currentDistance)
                            .font(.title3)
                            .bold()
                        Text("of \(context.attributes.targetDistance)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                DynamicIslandExpandedRegion(.center) {
                    HStack {
                        VStack {
                            Text(context.state.elapsedTime)
                                .font(.title2)
                                .bold()
                            Text("Time")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Divider()
                            .frame(height: 40)
                        
                        VStack {
                            Text(context.state.currentPace)
                                .font(.title2)
                                .bold()
                            Text("Pace")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text("\(context.state.calories) cal")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Button(action: {}) {
                            Label("End", systemImage: "stop.fill")
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.red)
                        .controlSize(.small)
                    }
                }
                
            } compactLeading: {
                Image(systemName: "figure.run")
                    .foregroundColor(Color("AccentColor"))
                
            } compactTrailing: {
                Text(context.state.currentDistance)
                    .font(.caption2)
                    .bold()
                
            } minimal: {
                Image(systemName: "figure.run")
                    .foregroundColor(Color("AccentColor"))
            }
            .widgetURL(URL(string: "liveactivitydemo://workout"))
            .keylineTint(Color("AccentColor"))
        }
    }
}
