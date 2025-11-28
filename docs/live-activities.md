# Live Activities & Dynamic Island

Add iOS Dynamic Island and Live Activities to your Expo app with real-time updates and rich UI.

## What are Live Activities?

Live Activities are a feature introduced in iOS 16.1 that display real-time information on:

- **Dynamic Island** (iPhone 14 Pro and later)
- **Lock Screen** (all iOS 16.1+ devices)

Perfect for:
- 🚗 Delivery tracking
- ⏱️ Timers and countdowns
- 🎵 Music playback
- 🏃 Workout tracking
- 📊 Live scores
- 🎮 Game status

## Quick Start

### 1. Create Live Activity Target

```bash
npx create-target
# Choose: live-activity → delivery-tracker → iOS
```

This creates:

```
targets/delivery-tracker/
├── expo-target.config.json
├── index.ts
└── ios/
    ├── DeliveryTrackerAttributes.swift
    ├── DeliveryTrackerLiveActivity.swift
    └── DeliveryTrackerBundle.swift
```

### 2. Configure Target

**targets/delivery-tracker/expo-target.config.json:**

```json
{
  "type": "live-activity",
  "name": "DeliveryTracker",
  "displayName": "Delivery Tracker",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "deploymentTarget": "16.1",
    "colors": {
      "AccentColor": "#FF6B00"
    }
  }
}
```

### 3. Define Activity Structure

**targets/delivery-tracker/ios/DeliveryTrackerAttributes.swift:**

```swift
import ActivityKit
import Foundation

struct DeliveryTrackerAttributes: ActivityAttributes {
    // Static data - doesn't change during activity lifetime
    var orderId: String
    var restaurantName: String
    
    // Dynamic data - updates during activity
    public struct ContentState: Codable, Hashable {
        var status: String
        var eta: String
        var driverName: String?
        var driverPhoto: String?
    }
}
```

### 4. Design Widget UI

**targets/delivery-tracker/ios/DeliveryTrackerLiveActivity.swift:**

```swift
import ActivityKit
import WidgetKit
import SwiftUI

@available(iOS 16.1, *)
struct DeliveryTrackerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DeliveryTrackerAttributes.self) { context in
            // LOCK SCREEN / BANNER UI
            HStack {
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
                }
            }
            .padding()
            .activityBackgroundTint(Color.orange.opacity(0.1))
            .activitySystemActionForegroundColor(Color.orange)
            
        } dynamicIsland: { context in
            // DYNAMIC ISLAND UI
            DynamicIsland {
                // EXPANDED VIEW (when long-pressed)
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Image(systemName: "takeoutbag.and.cup.and.straw.fill")
                            .foregroundColor(.orange)
                        VStack(alignment: .leading) {
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
                    VStack(alignment: .trailing) {
                        Text(context.state.eta)
                            .font(.title3)
                            .bold()
                        Text("ETA")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                DynamicIslandExpandedRegion(.center) {
                    VStack {
                        Text(context.state.status)
                            .font(.body)
                            .multilineTextAlignment(.center)
                        
                        if let driver = context.state.driverName {
                            HStack {
                                Image(systemName: "person.circle.fill")
                                Text(driver)
                            }
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.top, 4)
                        }
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    Button(action: {}) {
                        Label("Track Order", systemImage: "location.fill")
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                    .controlSize(.small)
                }
                
            } compactLeading: {
                // COMPACT LEFT SIDE
                Image(systemName: "takeoutbag.and.cup.and.straw.fill")
                    .foregroundColor(.orange)
                
            } compactTrailing: {
                // COMPACT RIGHT SIDE
                Text(context.state.eta)
                    .font(.caption2)
                    .bold()
                
            } minimal: {
                // MINIMAL (when multiple activities active)
                Image(systemName: "takeoutbag.and.cup.and.straw.fill")
                    .foregroundColor(.orange)
            }
            .widgetURL(URL(string: "myapp://order/\(context.attributes.orderId)"))
            .keylineTint(Color.orange)
        }
    }
}
```

### 5. Register Widget Bundle

**targets/delivery-tracker/ios/DeliveryTrackerBundle.swift:**

```swift
import WidgetKit
import SwiftUI

@main
struct DeliveryTrackerBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.1, *) {
            DeliveryTrackerLiveActivity()
        }
    }
}
```

### 6. Use in Your App

**App.tsx:**

```typescript
import { createLiveActivity } from 'expo-targets';
import { Button, View } from 'react-native';

function OrderTracker() {
  const delivery = createLiveActivity('DeliveryTracker', 'group.com.yourapp');
  
  const startTracking = async () => {
    // Check if activities are enabled
    const enabled = await areActivitiesEnabled();
    if (!enabled) {
      console.log('Live Activities are disabled');
      return;
    }
    
    // Start activity with static attributes and initial state
    const token = await delivery.start(
      {
        orderId: '12345',
        restaurantName: 'Pizza Palace'
      },
      {
        status: 'Order Received',
        eta: '30-40 min',
        driverName: null,
        driverPhoto: null
      }
    );
    
    console.log('Activity started:', token);
  };
  
  const updateStatus = async () => {
    await delivery.update({
      status: 'Preparing Your Order',
      eta: '25-35 min',
      driverName: null,
      driverPhoto: null
    });
  };
  
  const assignDriver = async () => {
    await delivery.update({
      status: 'Out for Delivery',
      eta: '10-15 min',
      driverName: 'John Doe',
      driverPhoto: 'https://example.com/driver.jpg'
    });
  };
  
  const completeDelivery = async () => {
    // End activity - use 'immediate', 'default', or 'after'
    await delivery.end('default');
  };
  
  return (
    <View>
      <Button title="Start Tracking" onPress={startTracking} />
      <Button title="Update Status" onPress={updateStatus} />
      <Button title="Assign Driver" onPress={assignDriver} />
      <Button title="Complete Delivery" onPress={completeDelivery} />
    </View>
  );
}
```

## API Reference

### createLiveActivity(activityId, appGroup)

Create a Live Activity manager.

```typescript
const activity = createLiveActivity('MyActivity', 'group.com.myapp');
```

### activity.start(attributes, contentState)

Start a new Live Activity.

**Parameters:**
- `attributes`: Static data that doesn't change (e.g., order ID, game name)
- `contentState`: Dynamic data that can be updated (e.g., status, score)

**Returns:** Activity token (string) or null

```typescript
const token = await activity.start(
  { gameId: '123', player: 'Alice' },
  { score: 0, level: 1 }
);
```

### activity.update(contentState)

Update an active Live Activity.

**Parameters:**
- `contentState`: New dynamic data

**Returns:** Success boolean

```typescript
await activity.update({ score: 100, level: 2 });
```

### activity.end(dismissalPolicy?)

End a Live Activity.

**Parameters:**
- `dismissalPolicy`: How to dismiss the activity
  - `'default'`: Stays visible for a while (default)
  - `'immediate'`: Dismisses immediately
  - `'after'`: Dismisses after a delay (iOS 16.2+)

**Returns:** Success boolean

```typescript
await activity.end('immediate');
```

### activity.getState()

Get current activity state.

**Returns:** LiveActivityState or null

```typescript
const state = await activity.getState();
console.log(state.contentState.score);
```

### activity.clear()

Clear all data for this activity.

**Returns:** Success boolean

```typescript
await activity.clear();
```

### areActivitiesEnabled()

Check if Live Activities are supported and enabled.

**Returns:** Boolean

```typescript
const enabled = await areActivitiesEnabled();
if (!enabled) {
  console.log('Live Activities not available');
}
```

### getActiveLiveActivities(appGroup)

Get all active Live Activities.

**Returns:** Array of active activities

```typescript
const activities = await getActiveLiveActivities('group.com.myapp');
console.log(`${activities.length} activities running`);
```

## Best Practices

### 1. Check Availability

Always check if Live Activities are enabled before starting:

```typescript
const enabled = await areActivitiesEnabled();
if (!enabled) {
  // Show fallback UI or alert
  return;
}
```

### 2. Handle Errors

Wrap activity operations in try-catch:

```typescript
try {
  await activity.start(attributes, state);
} catch (error) {
  console.error('Failed to start activity:', error);
}
```

### 3. Clean Up

End activities when done to free system resources:

```typescript
await activity.end('default');
```

### 4. Update Efficiently

Only update when data changes:

```typescript
const newState = { score: 150, level: 3 };
if (JSON.stringify(newState) !== JSON.stringify(oldState)) {
  await activity.update(newState);
}
```

### 5. Design for All Devices

Remember: Dynamic Island is iPhone 14 Pro+ only, but Live Activities work on all iOS 16.1+ devices via Lock Screen.

## Dynamic Island Layout

### Compact View

Shows when the activity is running in the background. Has two regions:

```
┌─────────────────────────────┐
│  [Leading]  ●●●  [Trailing] │
└─────────────────────────────┘
```

- **Leading**: Icon or small image (left)
- **Trailing**: Text or metric (right)

### Minimal View

Shows when multiple activities are active:

```
┌──────┐
│ [●●] │
└──────┘
```

- Single icon representing your activity

### Expanded View

Shows when user long-presses. Has four regions:

```
┌─────────────────────────────┐
│ [Leading]      [Trailing]   │
│                             │
│         [Center]            │
│                             │
│         [Bottom]            │
└─────────────────────────────┘
```

- **Leading**: Icon/image with title
- **Trailing**: Primary metric
- **Center**: Status message
- **Bottom**: Action buttons

## Advanced Topics

### Deep Linking

Handle taps on your Live Activity:

```swift
.widgetURL(URL(string: "myapp://order/\(orderId)"))
```

In your app:

```typescript
import { addEventListener } from 'expo-linking';

addEventListener('url', (event) => {
  const url = event.url;
  // myapp://order/12345
  const orderId = url.split('/').pop();
  navigateToOrder(orderId);
});
```

### Background Updates

Update Live Activities from push notifications (requires additional setup):

```swift
// In your notification service extension
Activity<DeliveryTrackerAttributes>.update(
    ActivityContent(
        state: DeliveryTrackerAttributes.ContentState(
            status: "Delivered",
            eta: "0 min"
        ),
        staleDate: nil
    ),
    alertConfiguration: nil
)
```

### Custom Colors

Use your app's brand colors:

```json
{
  "ios": {
    "colors": {
      "Primary": "#FF6B00",
      "Secondary": "#FFB84D",
      "Background": { "light": "#FFFFFF", "dark": "#1C1C1E" }
    }
  }
}
```

Then in Swift:

```swift
.foregroundColor(Color("Primary"))
.activityBackgroundTint(Color("Background"))
.keylineTint(Color("Primary"))
```

## Troubleshooting

### Activity doesn't appear

1. Check iOS version: iOS 16.1+ required
2. Verify App Group matches in config and Swift code
3. Ensure `NSSupportsLiveActivities` is in Info.plist (auto-added)
4. Check that activity was started successfully (non-null token)

### Updates not showing

1. Verify activity hasn't ended
2. Check that you're updating with new data (not same values)
3. Ensure App Group storage is accessible

### Dynamic Island not showing

1. Only available on iPhone 14 Pro, 15 Pro, 16 Pro models
2. Falls back to Lock Screen on other devices
3. Design for both experiences

### Build errors

```bash
# Clean and rebuild
npx expo prebuild --clean
cd ios && pod install && cd ..
npx expo run:ios
```

## Examples

See the example app for a complete implementation:

```bash
cd apps/live-activity-demo
npm install
npx expo run:ios
```

## Resources

- [Apple Human Interface Guidelines - Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities)
- [Apple Documentation - ActivityKit](https://developer.apple.com/documentation/activitykit)
- [WWDC 2022 - Meet ActivityKit](https://developer.apple.com/videos/play/wwdc2022/10184/)

## Requirements

- iOS 16.1+ (Dynamic Island: iPhone 14 Pro+)
- Expo SDK 50+
- Development build (`npx expo run:ios`)
- App Group configured
- macOS with Xcode 14+

## Next Steps

- [API Reference](./api.md) - Full TypeScript API
- [Configuration](./configuration.md) - All config options
- [Getting Started](./getting-started.md) - Build your first widget
