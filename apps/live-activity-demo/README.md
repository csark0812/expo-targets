# Live Activity Demo

This demo app showcases iOS Live Activities with expo-targets.

## Features

- ✨ Live Activities on Lock Screen
- 🏝️ Dynamic Island support (iPhone 14 Pro+)
- 🔄 Real-time updates
- 🎨 Custom SwiftUI layouts
- 📱 iOS 16.1+ support

## What are Live Activities?

Live Activities display real-time information on:
- **Lock Screen**: Large, informative cards showing live updates
- **Dynamic Island**: Interactive UI that replaces the notch (iPhone 14 Pro+)

Perfect for:
- 🏀 Sports scores
- 🚗 Ride sharing/delivery tracking  
- ⏱️ Timers and countdowns
- 🎵 Music playback
- 📦 Order tracking

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run prebuild**
   ```bash
   npx expo prebuild
   ```

3. **Run on iOS 16.1+ device**
   ```bash
   npx expo run:ios
   ```
   
   > ⚠️ **Note:** Live Activities require iOS 16.1+. They don't work in the simulator's lock screen or Dynamic Island (though the code will compile).

## How it Works

### 1. Target Configuration

The Live Activity is defined in `targets/score-activity/expo-target.config.json`:

```json
{
  "type": "live-activity",
  "name": "ScoreActivity",
  "platforms": ["ios"],
  "appGroup": "group.com.test.liveactivitydemo"
}
```

### 2. Swift Implementation

The Live Activity UI is in `targets/score-activity/ios/LiveActivity.swift`:

- **ActivityAttributes**: Defines static data (game name, team name)
- **ContentState**: Defines dynamic data (score, status, timestamp)
- **Dynamic Island UI**: Compact, expanded, and minimal presentations
- **Lock Screen UI**: Full card layout

### 3. Starting a Live Activity (Native Code Required)

To start and update Live Activities, you need to implement a native module:

```swift
import ActivityKit

// Start activity
let attributes = ScoreActivityAttributes(gameName: "Championship", teamName: "Blue Team")
let initialState = ScoreActivityAttributes.ContentState(
    score: 0, 
    status: "Game Starting",
    lastUpdate: Date()
)

let activity = try? Activity<ScoreActivityAttributes>.request(
    attributes: attributes,
    contentState: initialState,
    pushType: nil
)

// Update activity
Task {
    let updatedState = ScoreActivityAttributes.ContentState(
        score: 15,
        status: "In Progress", 
        lastUpdate: Date()
    )
    await activity?.update(using: updatedState)
}

// End activity
Task {
    await activity?.end(dismissalPolicy: .immediate)
}
```

## Main App Configuration

In `app.json`, enable Live Activities:

```json
{
  "ios": {
    "infoPlist": {
      "NSSupportsLiveActivities": true,
      "NSSupportsLiveActivitiesFrequentUpdates": true
    }
  }
}
```

## Dynamic Island Layouts

The Live Activity adapts to different Dynamic Island states:

### Compact
Small pill on both sides of the Dynamic Island
- Left: Trophy icon
- Right: Current score

### Expanded  
Full Dynamic Island with rich content
- Leading: Team icon and name
- Trailing: Large score display
- Center: Game status and time
- Bottom: Game name

### Minimal
Tiny circular representation when multiple activities are active
- Shows trophy icon only

## Remote Updates

For remote push updates, add Push Notifications capability:

```json
{
  "ios": {
    "infoPlist": {
      "NSSupportsLiveActivities": true,
      "NSSupportsLiveActivitiesFrequentUpdates": true
    },
    "entitlements": {
      "aps-environment": "development"
    }
  }
}
```

Then start activities with `pushType: .token` to enable push updates.

## Testing

1. **On Device (iOS 16.1+)**
   - Run the app
   - Start a Live Activity
   - Lock device → see it on Lock Screen
   - Unlock → see Dynamic Island (iPhone 14 Pro+)
   - Update score → watch real-time changes

2. **In Xcode Previews**
   - Open `LiveActivity.swift` in Xcode
   - Use `#Preview` macros to test different states
   - Preview all layouts: compact, expanded, minimal

## Best Practices

✅ **Do:**
- Keep UI simple and glanceable
- Update frequently (every 1-2 seconds)
- Show time-sensitive information
- End activities when complete

❌ **Don't:**
- Create activities that last >8 hours
- Update too frequently (>60 times/hour risks throttling)
- Show sensitive information (visible on Lock Screen)
- Require interaction (Live Activities are read-only)

## Next Steps

1. Implement native module for ActivityKit
2. Add push notification support for remote updates
3. Create different activity types (delivery, timer, etc.)
4. Add deep linking to open app from Live Activity taps

## Learn More

- [Apple: Displaying live data with Live Activities](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)
- [Human Interface Guidelines: Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities)
- [expo-targets Documentation](../../docs/getting-started.md)
