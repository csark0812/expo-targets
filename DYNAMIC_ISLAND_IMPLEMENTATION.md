# iOS Dynamic Island Support - Implementation Summary

This document summarizes the comprehensive implementation of iOS Dynamic Island and Live Activities support for expo-targets.

## Overview

Dynamic Islands are a new iOS feature (16.1+) that display real-time information in the pill-shaped area at the top of iPhone 14 Pro+ devices. On other iOS 16.1+ devices, Live Activities appear on the Lock Screen.

## Implementation Components

### 1. Configuration & Types

**Files Modified:**
- `packages/expo-targets/plugin/src/config.ts`
- `packages/expo-targets/plugin/src/ios/target.ts`

**Changes:**
- Added `'live-activity'` to `ExtensionType` union
- Added minimum deployment target: iOS 16.1
- Added bundle identifier suffix: `'live-activity'`
- Added TYPE_CHARACTERISTICS for live-activity:
  - Uses WidgetKit, SwiftUI, ActivityKit, AppIntents frameworks
  - Extension point: `com.apple.widgetkit-extension`
  - Includes `NSSupportsLiveActivities: true` in Info.plist

### 2. Native Swift Module

**Files Created:**
- `packages/expo-targets/ios/ExpoTargetsLiveActivityModule.swift`
- `packages/expo-targets/ios/ExpoTargetsLiveActivity.podspec`

**Functionality:**
- `startActivity()` - Initialize a Live Activity
- `updateActivity()` - Update activity content
- `endActivity()` - End an activity with dismissal policy
- `getActiveActivities()` - List all active activities
- `areActivitiesEnabled()` - Check if feature is enabled
- `getActivityState()` - Get current state
- `clearActivity()` - Clear activity data

**Storage:**
Uses App Group UserDefaults to share data between main app and widget extension.

### 3. TypeScript API Module

**Files Created:**
- `packages/expo-targets/src/modules/live-activity/index.ts`

**Files Modified:**
- `packages/expo-targets/src/index.ts` (added exports)

**API Classes:**

#### LiveActivityManager
```typescript
const activity = createLiveActivity('MyActivity', 'group.com.myapp');

// Start
await activity.start(attributes, contentState);

// Update
await activity.update(newState);

// End
await activity.end('default');

// Query
await activity.getState();
await activity.clear();
```

#### Global Functions
```typescript
// Check availability
await areActivitiesEnabled();

// Get all active
await getActiveLiveActivities(appGroup);
```

**Types:**
- `LiveActivityManager`
- `LiveActivityAttributes`
- `LiveActivityContentState`
- `LiveActivityState`
- `LiveActivity`
- `ActivityDismissalPolicy`

### 4. Swift Templates

**Files Created:**
- `packages/expo-targets/plugin/src/ios/templates/live-activity-attributes.swift`
- `packages/expo-targets/plugin/src/ios/templates/live-activity-widget.swift`
- `packages/expo-targets/plugin/src/ios/templates/live-activity-bundle.swift`
- `packages/expo-targets/plugin/src/ios/templates/live-activity-userdefaults.swift`

**Features:**
- Comprehensive Dynamic Island layouts (compact, minimal, expanded)
- Lock Screen UI support
- UserDefaults data loading example
- Configurable colors and styling

### 5. Documentation

**Files Created:**
- `docs/live-activities.md` - Complete guide with examples

**Files Modified:**
- `README.md` - Added live-activity to supported types
- `docs/configuration.md` - Added configuration examples
- `docs/api.md` - Added API reference section
- `apps/README.md` - Added example app listing

**Documentation Sections:**
- Quick start guide
- Activity structure definition
- Widget UI design patterns
- Dynamic Island layout guide
- API reference
- Best practices
- Troubleshooting

### 6. Example Application

**Directory Created:**
- `apps/live-activity-demo/`

**Example Activities:**
1. **Delivery Tracker**
   - Multi-stage progress (Order → Preparing → Pickup → Delivery)
   - Driver assignment
   - ETA countdown
   - Rich Dynamic Island UI

2. **Workout Tracker**
   - Distance tracking
   - Pace monitoring
   - Elapsed time
   - Calorie counter
   - Auto-updating simulation

3. **Countdown Timer**
   - Customizable durations (10s, 1m, 5m)
   - Progress visualization
   - Auto-completion

**Files:**
- App.tsx - Main demo with controls
- 3 complete target implementations with Swift code
- README with usage instructions

## Dynamic Island UI States

### Compact View
Left and right sides of the pill when activity is running.

```swift
compactLeading: { Image(...) }
compactTrailing: { Text(...) }
```

### Minimal View
Single icon when multiple activities are active.

```swift
minimal: { Image(...) }
```

### Expanded View
Full UI when user long-presses the island.

```swift
DynamicIslandExpandedRegion(.leading) { ... }
DynamicIslandExpandedRegion(.trailing) { ... }
DynamicIslandExpandedRegion(.center) { ... }
DynamicIslandExpandedRegion(.bottom) { ... }
```

## Key Features

✅ **Type-Safe API** - Full TypeScript support  
✅ **Dynamic Island** - Compact, minimal, expanded states  
✅ **Lock Screen** - Works on all iOS 16.1+ devices  
✅ **Real-time Updates** - Update without restarting  
✅ **App Group Storage** - Seamless data sharing  
✅ **Dismissal Policies** - Control how activities end  
✅ **State Management** - Query active activities  
✅ **Deep Linking** - Tap to open app  
✅ **Comprehensive Examples** - Three demo activities  

## Requirements

- iOS 16.1+ (Dynamic Island: iPhone 14 Pro+)
- Expo SDK 50+
- Development build (`npx expo run:ios`)
- App Group configured
- macOS with Xcode 14+

## Usage Example

```typescript
import { createLiveActivity, areActivitiesEnabled } from 'expo-targets';

// Check availability
const enabled = await areActivitiesEnabled();

// Create manager
const delivery = createLiveActivity('DeliveryTracker', 'group.com.myapp');

// Start activity
const token = await delivery.start(
  { orderId: '12345', restaurantName: 'Pizza Palace' },
  { status: 'Preparing', eta: '20 min' }
);

// Update activity
await delivery.update({
  status: 'Out for Delivery',
  eta: '5 min',
  driver: 'John Doe'
});

// End activity
await delivery.end('default');
```

## Testing

### On iPhone 14 Pro+ (Dynamic Island)
- Long-press Dynamic Island for expanded view
- Tap compact view to open app
- Multiple activities show minimal view

### On Other iOS 16.1+ Devices
- Live Activities appear on Lock Screen
- Swipe down from top to see in notification center
- Tap to open app

## File Changes Summary

### New Files (24)
- 1 Swift native module
- 1 podspec
- 1 TypeScript API module
- 4 Swift templates
- 1 comprehensive documentation
- 1 example app with 15 files

### Modified Files (7)
- Configuration types
- Target characteristics
- Main TypeScript exports
- README files (3)
- API documentation

## Next Steps for Users

1. **Quick Start:**
   ```bash
   npx create-target
   # Choose: live-activity
   ```

2. **Configure:**
   Edit `expo-target.config.json` with activity details

3. **Design Widget:**
   Customize Swift files in `targets/*/ios/`

4. **Use in App:**
   ```typescript
   import { createLiveActivity } from 'expo-targets';
   const activity = createLiveActivity('MyActivity', appGroup);
   ```

5. **Build & Test:**
   ```bash
   npx expo prebuild
   npx expo run:ios
   ```

## Resources

- [Live Activities Documentation](./docs/live-activities.md)
- [Configuration Reference](./docs/configuration.md)
- [API Reference](./docs/api.md)
- [Example App](./apps/live-activity-demo)
- [Apple HIG - Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities)
- [Apple Docs - ActivityKit](https://developer.apple.com/documentation/activitykit)

## Credits

Implementation by: expo-targets team  
iOS 16.1+ feature  
Requires iPhone 14 Pro+ for Dynamic Island  
Works on all iOS 16.1+ devices via Lock Screen
