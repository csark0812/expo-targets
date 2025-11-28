# Live Activities Implementation Summary

This document describes the complete implementation of Live Activities support in expo-targets.

## Overview

Live Activities are a new feature in iOS 16.1+ that display real-time information on the Lock Screen and in the Dynamic Island on iPhone 14 Pro models. This implementation adds full support for creating and managing Live Activities through expo-targets.

## Changes Made

### 1. Core Type Definitions (`packages/expo-targets/plugin/src/config.ts`)

- Added `'live-activity'` to the `ExtensionType` union
- Added minimum deployment target: `'live-activity': '16.1'`
- Added bundle identifier suffix: `'live-activity': 'live-activity'`

### 2. Target Characteristics (`packages/expo-targets/plugin/src/ios/target.ts`)

Added complete type characteristics for Live Activities:

```typescript
'live-activity': {
  requiresCode: true,
  targetType: 'app_extension',
  embedType: 'foundation-extension',
  frameworks: ['WidgetKit', 'SwiftUI', 'ActivityKit', 'AppIntents'],
  productType: 'com.apple.product-type.app-extension',
  extensionPointIdentifier: 'com.apple.widgetkit-extension',
  defaultUsesAppGroups: true,
  requiresEntitlements: true,
  basePlist: {
    NSSupportsLiveActivities: true,
  },
  supportsActivationRules: false,
  activationRulesLocation: 'none',
}
```

### 3. CLI Template (`packages/create-target/src/index.ts`)

Added Live Activity as a creation option in the CLI:

- Menu option: "Live Activity"
- Deployment target: "16.1"
- Swift template: Comprehensive ActivityKit implementation with:
  - `ActivityAttributes` structure for static and dynamic data
  - Full Dynamic Island support (compact, expanded, minimal)
  - Lock Screen UI
  - SwiftUI previews for all states

Template includes:
- Complete Live Activity widget configuration
- ActivityKit integration
- Dynamic Island layouts (leading, trailing, center, bottom regions)
- Compact presentations for Dynamic Island
- Minimal state for multiple activities
- Lock Screen card layout
- Xcode preview support

### 4. Example Application (`apps/live-activity-demo/`)

Created a complete demo app showing:

**App Structure:**
- `App.tsx` - React Native UI with controls
- `targets/score-activity/` - Live Activity implementation
  - `expo-target.config.json` - Configuration
  - `ios/LiveActivity.swift` - Complete Swift implementation
  - `index.ts` - Target export

**Features Demonstrated:**
- Starting Live Activities
- Updating activity state
- Ending activities
- Score tracking use case
- Dynamic Island presentations
- Lock Screen layouts

**Files Created:**
- `app.json` - Main app configuration with Live Activities support
- `package.json` - Dependencies
- `index.js` - Entry point
- `App.tsx` - Demo UI
- `README.md` - Comprehensive usage guide
- `targets/score-activity/expo-target.config.json` - Target config
- `targets/score-activity/index.ts` - Target instance
- `targets/score-activity/ios/LiveActivity.swift` - Swift implementation

### 5. Documentation

**New Files:**
- `docs/live-activities.md` - Complete Live Activities guide covering:
  - Prerequisites and setup
  - Quick start tutorial
  - Anatomy of Live Activities
  - Dynamic Island presentations
  - Starting/updating/ending activities
  - Native module integration
  - Remote push updates
  - Best practices
  - Testing strategies
  - Common issues and solutions

**Updated Files:**
- `docs/configuration.md`:
  - Added Live Activity to extension types table
  - Added Live Activity configuration section
  - Added to deployment targets table
  - Included ActivityAttributes examples
  - Documented starting activities with ActivityKit

- `README.md`:
  - Updated tagline to mention Live Activities
  - Added `live-activity` to supported extensions table
  - Added live-activity-demo to examples
  - Added Live Activities Guide to documentation links

- `apps/README.md`:
  - Added "Live Activities & Dynamic Island" section
  - Added live-activity-demo to examples
  - Updated quick reference table with iOS version requirements
  - Added Live Activities Guide link

- `CHANGELOG.md`:
  - Added Live Activities to Unreleased section
  - Listed all new features and capabilities
  - Updated supported target types

## Configuration Example

### Target Configuration

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
      "AccentColor": { "light": "#4CAF50", "dark": "#81C784" },
      "BackgroundColor": { "light": "#FFFFFF", "dark": "#1C1C1E" }
    }
  }
}
```

### Main App Configuration

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSSupportsLiveActivities": true,
        "NSSupportsLiveActivitiesFrequentUpdates": true
      },
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.yourapp"
        ]
      }
    }
  }
}
```

## Swift Implementation

The generated Swift template includes:

### ActivityAttributes Structure
```swift
struct MyActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var value: Int        // Dynamic data
        var status: String
    }
    var name: String         // Static data
}
```

### Dynamic Island Support
- **Compact**: Small pills on both sides
- **Expanded**: Full Dynamic Island with 4 regions (leading, trailing, center, bottom)
- **Minimal**: Tiny circle when multiple activities active

### Lock Screen UI
- Full card layout with VStack/HStack
- Custom colors from config
- Activity background tint
- System action colors

### Xcode Previews
Multiple preview macros for testing:
- Content preview (Lock Screen)
- Dynamic Island compact
- Dynamic Island expanded
- Dynamic Island minimal

## Usage Flow

1. **Create Target**
   ```bash
   npx create-target
   # Select: Live Activity
   ```

2. **Configure**
   - Update `app.json` with Live Activities support
   - Set App Group in target config
   - Customize colors and layout in Swift

3. **Build**
   ```bash
   npx expo prebuild
   npx expo run:ios
   ```

4. **Start Activity** (Native Swift)
   ```swift
   let activity = try Activity<MyActivityAttributes>.request(
       attributes: attributes,
       contentState: initialState,
       pushType: nil
   )
   ```

5. **Update Activity**
   ```swift
   await activity.update(using: newState)
   ```

6. **End Activity**
   ```swift
   await activity.end(dismissalPolicy: .immediate)
   ```

## Technical Details

### Frameworks Required
- WidgetKit
- SwiftUI
- ActivityKit (iOS 16.1+)
- AppIntents

### Extension Point
- Same as widgets: `com.apple.widgetkit-extension`
- Uses `NSSupportsLiveActivities: true` in Info.plist

### Deployment Target
- Minimum: iOS 16.1
- Recommended: iOS 16.1

### Bundle Identifier
- Suffix: `.live-activity`
- Example: `com.yourapp.live-activity`

## Features

### ✅ Implemented
- Complete Swift template generation
- ActivityAttributes structure
- Dynamic Island support (all presentations)
- Lock Screen UI
- Color configuration
- App Group integration
- Xcode target creation
- Info.plist configuration
- Comprehensive documentation
- Example application
- CLI integration

### 🔄 Future Enhancements
- Native React Native module for ActivityKit
- TypeScript API for starting/updating activities
- Remote push notification helpers
- Activity state management utilities
- Testing utilities

## Testing

### On Device (iOS 16.1+)
1. Build and install app
2. Run app and start Live Activity
3. Lock device → see Lock Screen card
4. Unlock → see Dynamic Island (iPhone 14 Pro+)
5. Update activity → observe real-time changes
6. Long-press Dynamic Island → see expanded view

### In Xcode Previews
1. Open `LiveActivity.swift` in Xcode
2. Use Canvas to preview different states
3. Test all presentations (compact, expanded, minimal)
4. Verify layouts and colors

## Best Practices

### Do ✅
- Keep UI simple and glanceable
- Update frequently (1-2 seconds)
- End activities when complete
- Test on physical device
- Use appropriate dismissal policies

### Don't ❌
- Run activities >8 hours
- Show sensitive information
- Require user interaction
- Update >60 times/hour
- Forget to end activities

## Dependencies

No new npm dependencies added. Uses existing:
- ActivityKit (iOS framework)
- WidgetKit (iOS framework)
- SwiftUI (iOS framework)

## Breaking Changes

None. This is a purely additive feature.

## Migration Guide

Not applicable - new feature, no migration needed.

## References

- [Apple: Displaying live data with Live Activities](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)
- [Human Interface Guidelines: Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities)
- [ActivityKit Framework](https://developer.apple.com/documentation/activitykit)

## File Manifest

### Modified Files
- `packages/expo-targets/plugin/src/config.ts`
- `packages/expo-targets/plugin/src/ios/target.ts`
- `packages/create-target/src/index.ts`
- `README.md`
- `docs/configuration.md`
- `apps/README.md`
- `CHANGELOG.md`

### New Files
- `docs/live-activities.md`
- `apps/live-activity-demo/app.json`
- `apps/live-activity-demo/package.json`
- `apps/live-activity-demo/index.js`
- `apps/live-activity-demo/App.tsx`
- `apps/live-activity-demo/README.md`
- `apps/live-activity-demo/targets/score-activity/expo-target.config.json`
- `apps/live-activity-demo/targets/score-activity/index.ts`
- `apps/live-activity-demo/targets/score-activity/ios/LiveActivity.swift`

## Summary

This implementation provides complete support for iOS 16.1+ Live Activities in expo-targets, including:

- Full CLI integration for scaffolding
- Comprehensive Swift templates with Dynamic Island support
- Complete documentation and examples
- Production-ready configuration
- Xcode target generation
- Info.plist configuration

Users can now create Live Activities as easily as they create widgets, with the same developer experience and configuration patterns.
