# Live Activities Guide

Live Activities let you display real-time information on the Lock Screen and in the Dynamic Island on iPhone 14 Pro and later models.

## Prerequisites

- iOS 16.1 or later
- iPhone with iOS 16.1+ (Dynamic Island requires iPhone 14 Pro+)
- Xcode 14.1+
- Expo SDK 50+

## What are Live Activities?

Live Activities are a special type of interactive notification that:

- **Stay on the Lock Screen** for up to 8 hours
- **Show in the Dynamic Island** on iPhone 14 Pro and later
- **Update in real-time** without user interaction
- **Display rich, glanceable information**

Perfect use cases:
- 🏀 Sports scores
- 🚗 Ride sharing/delivery tracking
- ⏱️ Timers and countdowns
- 🎵 Music playback
- 📦 Order status

## Quick Start

### 1. Install

```bash
npm install expo-targets
```

### 2. Configure Main App

Add Live Activities support to your `app.json`:

```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "ios": {
      "bundleIdentifier": "com.yourcompany.myapp",
      "infoPlist": {
        "NSSupportsLiveActivities": true,
        "NSSupportsLiveActivitiesFrequentUpdates": true
      },
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.yourcompany.myapp"
        ]
      }
    },
    "plugins": ["expo-targets"]
  }
}
```

### 3. Create Live Activity

```bash
npx create-target
# Choose: Live Activity → score-tracker → iOS
```

This creates:

```
targets/score-tracker/
├── expo-target.config.json
├── index.ts
└── ios/
    └── LiveActivity.swift
```

### 4. Configure the Target

Update `targets/score-tracker/expo-target.config.json`:

```json
{
  "type": "live-activity",
  "name": "ScoreTracker",
  "displayName": "Score Tracker",
  "platforms": ["ios"],
  "appGroup": "group.com.yourcompany.myapp",
  "ios": {
    "deploymentTarget": "16.1",
    "colors": {
      "AccentColor": { "light": "#007AFF", "dark": "#0A84FF" },
      "ScoreColor": { "light": "#4CAF50", "dark": "#81C784" }
    }
  }
}
```

### 5. Build and Run

```bash
npx expo prebuild
npx expo run:ios
```

## Anatomy of a Live Activity

### Activity Attributes

Define your Live Activity's data structure in Swift:

```swift
struct ScoreTrackerAttributes: ActivityAttributes {
    // ContentState: Dynamic data that changes
    public struct ContentState: Codable, Hashable {
        var score: Int
        var status: String
        var lastUpdate: Date
    }
    
    // Static data that stays the same
    var gameName: String
    var teamName: String
}
```

### Dynamic Island Presentations

Live Activities adapt to four different presentations:

#### 1. Compact

Small pill on both sides of the Dynamic Island.

```swift
compactLeading: {
    Image(systemName: "trophy.fill")
        .foregroundColor(.yellow)
}
compactTrailing: {
    Text("\(context.state.score)")
        .font(.caption2)
}
```

#### 2. Expanded

Full Dynamic Island with rich content.

```swift
DynamicIsland {
    DynamicIslandExpandedRegion(.leading) {
        // Left content
    }
    DynamicIslandExpandedRegion(.trailing) {
        // Right content
    }
    DynamicIslandExpandedRegion(.center) {
        // Center content
    }
    DynamicIslandExpandedRegion(.bottom) {
        // Bottom content
    }
}
```

#### 3. Minimal

Tiny circle when multiple Live Activities are active.

```swift
minimal: {
    Image(systemName: "trophy.fill")
}
```

#### 4. Lock Screen

Large card on the Lock Screen.

```swift
ActivityConfiguration(for: ScoreTrackerAttributes.self) { context in
    LiveActivityView(context: context)
}
```

## Starting and Updating Activities

### Starting an Activity

Live Activities must be started from Swift code using ActivityKit:

```swift
import ActivityKit

let attributes = ScoreTrackerAttributes(
    gameName: "Championship",
    teamName: "Blue Team"
)

let initialState = ScoreTrackerAttributes.ContentState(
    score: 0,
    status: "Game Starting",
    lastUpdate: Date()
)

let activity = try Activity<ScoreTrackerAttributes>.request(
    attributes: attributes,
    contentState: initialState,
    pushType: nil  // or .token for push updates
)
```

### Updating an Activity

```swift
Task {
    let newState = ScoreTrackerAttributes.ContentState(
        score: 15,
        status: "In Progress",
        lastUpdate: Date()
    )
    
    await activity.update(using: newState)
}
```

### Ending an Activity

```swift
Task {
    await activity.end(
        dismissalPolicy: .immediate  // or .default, .after(Date())
    )
}
```

## Native Module Integration

To control Live Activities from React Native, create a native module:

### iOS Native Module

```swift
// ExpoLiveActivityModule.swift
import ExpoModulesCore
import ActivityKit

public class ExpoLiveActivityModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ExpoLiveActivity")
        
        AsyncFunction("start") { (attributes: [String: Any]) -> String? in
            // Start Live Activity
            // Return activity ID
        }
        
        AsyncFunction("update") { (activityId: String, state: [String: Any]) in
            // Update Live Activity
        }
        
        AsyncFunction("end") { (activityId: String) in
            // End Live Activity
        }
    }
}
```

### React Native Usage

```typescript
import { NativeModules } from 'react-native';

const { ExpoLiveActivity } = NativeModules;

// Start
const activityId = await ExpoLiveActivity.start({
  gameName: 'Championship',
  teamName: 'Blue Team',
  score: 0,
  status: 'Starting',
});

// Update
await ExpoLiveActivity.update(activityId, {
  score: 15,
  status: 'In Progress',
});

// End
await ExpoLiveActivity.end(activityId);
```

## Remote Push Updates

Enable remote updates via push notifications:

### 1. Enable Push Notifications

```json
{
  "ios": {
    "entitlements": {
      "aps-environment": "development"
    }
  }
}
```

### 2. Request with Push Token

```swift
let activity = try Activity<ScoreTrackerAttributes>.request(
    attributes: attributes,
    contentState: initialState,
    pushType: .token  // Enable push updates
)

// Get the push token
let pushToken = activity.pushToken
```

### 3. Send Push Notifications

Send updates via Apple Push Notification service (APNs):

```json
{
  "aps": {
    "timestamp": 1234567890,
    "event": "update",
    "content-state": {
      "score": 25,
      "status": "Half Time",
      "lastUpdate": "2024-01-15T12:30:00Z"
    }
  }
}
```

## Best Practices

### Do ✅

- **Keep UI Simple**: Design for glanceability
- **Update Frequently**: Real-time data (every 1-2 seconds is fine)
- **End When Complete**: Always end activities when done
- **Test on Device**: Dynamic Island requires physical iPhone 14 Pro+
- **Use Appropriate Dismissal**: Choose the right dismissal policy

### Don't ❌

- **Don't Run Forever**: 8-hour maximum lifetime
- **Don't Show Sensitive Data**: Visible on Lock Screen to everyone
- **Don't Require Interaction**: Activities are read-only
- **Don't Update Too Often**: >60 updates/hour may be throttled
- **Don't Forget to End**: System will end after 8 hours, but end earlier

## Styling and Colors

Define colors in your config:

```json
{
  "ios": {
    "colors": {
      "AccentColor": { "light": "#007AFF", "dark": "#0A84FF" },
      "BackgroundColor": { "light": "#FFFFFF", "dark": "#1C1C1E" },
      "ScoreColor": { "light": "#4CAF50", "dark": "#81C784" }
    }
  }
}
```

Use in Swift:

```swift
Text("Score")
    .foregroundColor(Color("AccentColor"))

VStack {
    // content
}
.activityBackgroundTint(Color("BackgroundColor"))
.activitySystemActionForegroundColor(Color("AccentColor"))
```

## Testing

### On Device (iOS 16.1+)

1. Build and run on device
2. Start a Live Activity
3. Lock device → see Lock Screen card
4. Unlock → see Dynamic Island (iPhone 14 Pro+)
5. Update activity → observe real-time changes
6. Long-press → see expanded view

### In Xcode Previews

Use `#Preview` macros to test layouts:

```swift
#Preview("Live Activity", as: .content, using: ScoreTrackerAttributes(
    gameName: "Championship",
    teamName: "Blue"
)) {
    ScoreTracker()
} contentStates: {
    ScoreTrackerAttributes.ContentState(score: 0, status: "Starting", lastUpdate: Date())
    ScoreTrackerAttributes.ContentState(score: 50, status: "In Progress", lastUpdate: Date())
}

#Preview("Dynamic Island Compact", as: .dynamicIsland(.compact), using: attributes) {
    ScoreTracker()
} contentStates: {
    state1
}

#Preview("Dynamic Island Expanded", as: .dynamicIsland(.expanded), using: attributes) {
    ScoreTracker()
} contentStates: {
    state1
}
```

## Common Issues

### Activity Not Appearing

**Problem**: Live Activity doesn't show on Lock Screen

**Solutions**:
1. Verify iOS 16.1+ on device
2. Check `NSSupportsLiveActivities: true` in main app's Info.plist
3. Ensure activity was started successfully (check for errors)
4. Try restarting device

### Dynamic Island Not Working

**Problem**: No Dynamic Island presentation

**Solutions**:
1. Requires iPhone 14 Pro or later
2. Make sure device is unlocked
3. Check that Live Activity is actually running
4. Verify `dynamicIsland` closure is implemented

### Updates Not Appearing

**Problem**: Activity started but updates don't show

**Solutions**:
1. Verify activity reference is still valid
2. Check for update errors in console
3. Ensure activity hasn't ended
4. Try force-touch on Dynamic Island to expand

### Build Errors

**Problem**: Build fails with ActivityKit errors

**Solutions**:
1. Check deployment target is 16.1+
2. Verify ActivityKit framework is linked
3. Clean build folder (⇧⌘K in Xcode)
4. Delete derived data

## Examples

See the [live-activity-demo](../apps/live-activity-demo) for a complete working example with:

- Score tracking
- Real-time updates
- Dynamic Island layouts
- Lock Screen UI
- Proper lifecycle management

## Learn More

- [Apple: Displaying live data with Live Activities](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)
- [Human Interface Guidelines: Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities)
- [ActivityKit Framework](https://developer.apple.com/documentation/activitykit)
- [Configuration Reference](./configuration.md)
