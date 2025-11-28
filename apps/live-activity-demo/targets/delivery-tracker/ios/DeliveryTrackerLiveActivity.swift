import ActivityKit
import WidgetKit
import SwiftUI

@available(iOS 16.1, *)
struct DeliveryTrackerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DeliveryTrackerAttributes.self) { context in
            // Lock screen/banner UI
            HStack(spacing: 12) {
                Image(systemName: "takeoutbag.and.cup.and.straw.fill")
                    .font(.title2)
                    .foregroundColor(Color("AccentColor"))
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(context.attributes.restaurantName)
                        .font(.headline)
                    Text("Order #\(context.attributes.orderId)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text(context.state.status)
                        .font(.subheadline)
                        .bold()
                    Text(context.state.eta)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .activityBackgroundTint(Color.orange.opacity(0.1))
            .activitySystemActionForegroundColor(Color.orange)
            
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Image(systemName: "takeoutbag.and.cup.and.straw.fill")
                            .foregroundColor(Color("AccentColor"))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.restaurantName)
                                .font(.caption)
                                .bold()
                            Text("Order #\(context.attributes.orderId)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(context.state.eta)
                            .font(.title3)
                            .bold()
                        Text("ETA")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 8) {
                        Text(context.state.status)
                            .font(.body)
                            .multilineTextAlignment(.center)
                        
                        if let driverName = context.state.driverName {
                            HStack {
                                Image(systemName: "person.circle.fill")
                                Text(driverName)
                            }
                            .font(.caption)
                            .foregroundColor(.secondary)
                        }
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Button(action: {}) {
                            Label("Track", systemImage: "location.fill")
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Color("AccentColor"))
                        .controlSize(.small)
                        
                        Spacer()
                        
                        Button(action: {}) {
                            Label("Call", systemImage: "phone.fill")
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                }
                
            } compactLeading: {
                Image(systemName: "takeoutbag.and.cup.and.straw.fill")
                    .foregroundColor(Color("AccentColor"))
                
            } compactTrailing: {
                Text(context.state.eta)
                    .font(.caption2)
                    .bold()
                
            } minimal: {
                Image(systemName: "takeoutbag.and.cup.and.straw.fill")
                    .foregroundColor(Color("AccentColor"))
            }
            .widgetURL(URL(string: "liveactivitydemo://order/\(context.attributes.orderId)"))
            .keylineTint(Color("AccentColor"))
        }
    }
}
