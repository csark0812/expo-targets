# Configuration Reference

Complete reference for configuring expo-targets extensions using `expo-target.config.json`.

## Overview

expo-targets uses JSON (or JavaScript/TypeScript) configuration files for defining targets. Each target lives in its own directory under `targets/` with an `expo-target.config.json` file.

### File Structure

```
your-app/
├── targets/
│   ├── my-widget/
│   │   ├── expo-target.config.json  ← Configuration
│   │   ├── index.ts                  ← Runtime API
│   │   └── ios/
│   │       └── Widget.swift          ← Implementation
│   └── another-widget/
│       ├── expo-target.config.json
│       └── ios/
│           └── Widget.swift
└── app.json
```

### Supported Formats

- `expo-target.config.json` - JSON
- `expo-target.config.js` - JavaScript (can export function)
- `expo-target.config.ts` - TypeScript

---

## Configuration Schema

### Complete Property Table

| Property                     | Type       | Required    | Default                  | Description                                |
| ---------------------------- | ---------- | ----------- | ------------------------ | ------------------------------------------ |
| **Root Level**               |
| `type`                       | `string`   | ✅ Yes      | -                        | Extension type (widget, clip, share, etc.) |
| `name`                       | `string`   | ✅ Yes      | -                        | Target identifier (PascalCase)             |
| `platforms`                  | `string[]` | ✅ Yes      | -                        | Supported platforms (["ios"])              |
| `displayName`                | `string`   | ❌ Optional | `name` value             | Human-readable name for UI                 |
| `appGroup`                   | `string`   | ❌ Optional | Auto-inherited           | App Group for data sharing                 |
| `entry`                      | `string`   | ❌ Optional | -                        | React Native entry file path               |
| `excludedPackages`           | `string[]` | ❌ Optional | `[]`                     | Packages to exclude from RN bundle         |
| `ios`                        | `object`   | ❌ Optional | `{}`                     | iOS-specific configuration                 |
| `android`                    | `object`   | ❌ Optional | `{}`                     | Android-specific configuration (widgets)   |
| **iOS Platform**             |
| `ios.deploymentTarget`       | `string`   | ❌ Optional | `"18.0"`                 | Minimum iOS version                        |
| `ios.bundleIdentifier`       | `string`   | ❌ Optional | Auto-generated           | Bundle ID (absolute or relative)           |
| `ios.displayName`            | `string`   | ❌ Optional | Root `displayName`       | Platform-specific display name             |
| `ios.icon`                   | `string`   | ❌ Optional | -                        | Path to icon file                          |
| `ios.colors`                 | `object`   | ❌ Optional | `{}`                     | Named colors for Assets.xcassets           |
| `ios.images`                 | `object`   | ❌ Optional | `{}`                     | Named images for Assets.xcassets           |
| `ios.frameworks`             | `string[]` | ❌ Optional | Type defaults            | Additional frameworks to link              |
| `ios.entitlements`           | `object`   | ❌ Optional | Type defaults            | Custom entitlements                        |
| `ios.infoPlist`              | `object`   | ❌ Optional | Type defaults            | Custom Info.plist entries                  |
| `ios.activationRules`        | `array`    | ❌ Optional | -                        | Share extension activation rules           |
| `ios.preprocessingFile`      | `string`   | ❌ Optional | -                        | Preprocessing JS for web content           |
| `ios.stickerPacks`           | `array`    | ❌ Optional | -                        | iMessage sticker pack configuration        |
| `ios.imessageAppIcon`        | `string`   | ❌ Optional | -                        | iMessage app icon path                     |
| **Android Platform**         |
| `android.minSdkVersion`      | `number`   | ❌ Optional | `26`                     | Minimum Android API level                  |
| `android.minWidth`           | `string`   | ❌ Optional | `"180dp"`                | Minimum widget width                       |
| `android.minHeight`          | `string`   | ❌ Optional | `"110dp"`                | Minimum widget height                      |
| `android.targetCellWidth`    | `number`   | ❌ Optional | -                        | Target grid cell width                     |
| `android.targetCellHeight`   | `number`   | ❌ Optional | -                        | Target grid cell height                    |
| `android.maxResizeWidth`     | `string`   | ❌ Optional | -                        | Maximum resize width                       |
| `android.maxResizeHeight`    | `string`   | ❌ Optional | -                        | Maximum resize height                      |
| `android.updatePeriodMillis` | `number`   | ❌ Optional | `1800000`                | Update interval (30 min minimum)           |
| `android.resizeMode`         | `string`   | ❌ Optional | `"horizontal\|vertical"` | Widget resize behavior                     |
| `android.widgetCategory`     | `string`   | ❌ Optional | `"home_screen"`          | Widget category                            |
| `android.previewImage`       | `string`   | ❌ Optional | -                        | Preview image resource                     |
| `android.description`        | `string`   | ❌ Optional | -                        | Widget description                         |
| `android.useGlance`          | `boolean`  | ❌ Optional | `true` (API 33+)         | Use Glance API vs legacy AppWidget         |
| `android.colors`             | `object`   | ❌ Optional | `{}`                     | Named colors (snake_case)                  |
| `android.permissions`        | `string[]` | ❌ Optional | `[]`                     | Required Android permissions               |

### Basic Schema Example

```json
{
  "type": "widget",
  "name": "MyWidget",
  "displayName": "My Widget",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    // iOS-specific configuration
  }
}
```

---

## Required Fields

### `type`

**Type:** `string`

Extension type. Determines product type, frameworks, and Info.plist configuration.

```json
{
  "type": "widget"
}
```

**Available types:**

| Type                      | iOS Version | Description                        |
| ------------------------- | ----------- | ---------------------------------- |
| `widget`                  | iOS 14+     | Home screen widgets                |
| `clip`                    | iOS 14+     | App Clips                          |
| `stickers`                | iOS 10+     | iMessage sticker packs             |
| `share`                   | iOS 8+      | Share extensions                   |
| `action`                  | iOS 8+      | Action extensions                  |
| `safari`                  | iOS 15+     | Safari web extensions              |
| `notification-content`    | iOS 10+     | Notification content extensions    |
| `notification-service`    | iOS 10+     | Notification service extensions    |
| `intent`                  | iOS 12+     | Siri intent extensions             |
| `intent-ui`               | iOS 12+     | Siri intent UI extensions          |
| `spotlight`               | iOS 9+      | Spotlight index extensions         |
| `bg-download`             | iOS 7+      | Background download extensions     |
| `quicklook-thumbnail`     | iOS 11+     | QuickLook thumbnail extensions     |
| `location-push`           | iOS 15+     | Location push service extensions   |
| `credentials-provider`    | iOS 12+     | Credential provider extensions     |
| `account-auth`            | iOS 12.2+   | Account authentication extensions  |
| `app-intent`              | iOS 16+     | App intent extensions              |
| `device-activity-monitor` | iOS 15+     | Device activity monitor extensions |
| `matter`                  | iOS 16.1+   | Matter extensions                  |
| `watch`                   | watchOS 2+  | Watch app extensions               |

### `name`

**Type:** `string`

Target identifier used in Xcode and runtime API. Use PascalCase.

```json
{
  "name": "MyWidget"
}
```

**Rules:**

- Used as Xcode target name
- Used in `createTarget('MyWidget')`
- Used as widget `kind` in iOS
- PascalCase recommended
- No spaces (hyphens and underscores OK)

### `platforms`

**Type:** `string[]`

Array of supported platforms.

```json
{
  "platforms": ["ios"]
}
```

**Available platforms:**

- `"ios"` - iOS
- `"android"` - Android (widgets only)

---

## Optional Fields

### `displayName`

**Type:** `string`

Human-readable name shown in UI (widget gallery, extension picker, etc.).

```json
{
  "displayName": "My Awesome Widget"
}
```

**Default:** Uses `name` if not specified

**Where it appears:**

- Widget gallery
- Home screen widget configuration
- Extension picker sheets
- App Store listing

### `appGroup`

**Type:** `string`
**Required:** ❌ Optional (auto-inherited if not specified)

App Group identifier for shared data storage.

```json
{
  "appGroup": "group.com.yourcompany.yourapp"
}
```

**Rules:**

- Must start with `group.`
- Must match App Group in `app.json` entitlements
- Must be registered in Apple Developer Portal for physical devices
- Used by `UserDefaults(suiteName:)` in Swift

**Default:** Auto-inherited from main app's first App Group if not specified

**When to specify:**

- Multiple App Groups and you want a specific one
- Target needs different App Group than main app
- Explicit configuration preferred

### `entry`

**Type:** `string`
**Required:** ❌ Optional
**Applies to:** `share`, `action`, `clip` types only

React Native entry point for extensions that support RN rendering.

```json
{
  "entry": "./targets/share-ext/index.tsx"
}
```

**Requirements:**

- Must be a valid file path relative to project root
- File must exist at prebuild time
- File must register component with `AppRegistry.registerComponent`
- Component name must match target `name`
- Wrap Metro config with `withTargetsMetro`
- Must build in Release mode

**Example entry file:**

```typescript
// targets/share-ext/index.tsx
import { AppRegistry } from 'react-native';
import ShareExtension from './src/ShareExtension';

AppRegistry.registerComponent('ShareExt', () => ShareExtension);
```

**See also:** [React Native Extensions Guide](./react-native-extensions.md)

### `excludedPackages`

**Type:** `string[]`
**Required:** ❌ Optional
**Only applies when:** `entry` field is specified

Expo/React Native packages to exclude from extension bundle (reduces size).

```json
{
  "excludedPackages": [
    "expo-updates",
    "expo-dev-client",
    "@react-native-community/netinfo"
  ]
}
```

**Common exclusions:**

| Package                                     | Reason                        | Size Savings |
| ------------------------------------------- | ----------------------------- | ------------ |
| `expo-updates`                              | OTA updates not needed        | ~500KB       |
| `expo-dev-client`                           | Development tools             | ~800KB       |
| `@react-native-community/netinfo`           | Network monitoring not needed | ~100KB       |
| `react-native-reanimated`                   | Animations if not used        | ~1.5MB       |
| `@react-native-async-storage/async-storage` | Use App Groups instead        | ~200KB       |

**Validation:**

- Ignored if `entry` is not specified
- Warning logged if used without `entry`

**See also:** [React Native Extensions Guide](./react-native-extensions.md)

---

## iOS Platform Configuration

### `ios.deploymentTarget`

**Type:** `string`

Minimum iOS version required for this extension.

```json
{
  "ios": {
    "deploymentTarget": "14.0"
  }
}
```

**Default:** `"18.0"`

**Recommendations by type:**

- `widget`: `"14.0"`
- `clip`: `"14.0"`
- `stickers`: `"10.0"`
- `share`: `"8.0"`

### `ios.bundleIdentifier`

**Type:** `string`

Bundle identifier for the extension.

```json
// Absolute
{
  "ios": {
    "bundleIdentifier": "com.yourcompany.customwidget"
  }
}

// Relative (recommended)
{
  "ios": {
    "bundleIdentifier": ".widget"
  }
}
```

**Default:** Auto-generated from type (e.g., `.widget`)

**Rules:**

- Relative (starts with `.`): Appended to main app bundle ID
- Absolute (no leading `.`): Used as-is
- Must be unique across all targets

### `ios.displayName`

**Type:** `string`

Platform-specific display name (overrides root `displayName` for iOS).

```json
{
  "ios": {
    "displayName": "iOS Widget Name"
  }
}
```

### `ios.icon`

**Type:** `string`

Path to icon file for the extension.

```json
{
  "ios": {
    "icon": "./assets/widget-icon.png"
  }
}
```

**Requirements:**

- Relative path from project root
- PNG format recommended
- Automatically added to `Assets.xcassets`

### `ios.colors`

**Type:** `Record<string, string | Color>`

Named colors for use in extension UI. Automatically generates color sets in `Assets.xcassets`.

```json
{
  "ios": {
    "colors": {
      "AccentColor": "#007AFF",
      "Background": {
        "light": "#FFFFFF",
        "dark": "#1C1C1E"
      },
      "Primary": {
        "color": "#007AFF",
        "darkColor": "#0A84FF"
      }
    }
  }
}
```

**Color formats:**

- Hex: `"#RGB"`, `"#RRGGBB"`, `"#RRGGBBAA"`
- RGB: `"rgb(r, g, b)"`
- RGBA: `"rgba(r, g, b, a)"`
- Named: CSS color names

**Light/Dark mode:**

```json
{
  "light": "#FFFFFF",
  "dark": "#000000"
}
```

Or:

```json
{
  "color": "#FFFFFF",
  "darkColor": "#000000"
}
```

**Usage in Swift:**

```swift
Color("AccentColor")
Color("Background")
```

### `ios.images`

**Type:** `Record<string, string>`

Named images for extension assets.

```json
{
  "ios": {
    "images": {
      "Logo": "./assets/logo.png",
      "Banner": "./assets/banner.png"
    }
  }
}
```

**Requirements:**

- Relative paths from project root
- Supports @2x, @3x naming
- PNG, JPEG, PDF supported

**Usage in Swift:**

```swift
Image("Logo")
Image("Banner")
```

### `ios.frameworks`

**Type:** `string[]`

Additional frameworks to link.

```json
{
  "ios": {
    "frameworks": ["CoreLocation", "MapKit"]
  }
}
```

**Default frameworks by type:**

| Type             | Default Frameworks                                  |
| ---------------- | --------------------------------------------------- |
| `widget`         | `WidgetKit`, `SwiftUI`, `ActivityKit`, `AppIntents` |
| `stickers`       | `Messages`                                          |
| `share`          | `Social`, `MobileCoreServices`                      |
| `notification-*` | `UserNotifications`                                 |

### `ios.entitlements`

**Type:** `Record<string, any>`

Custom entitlements for the extension.

```json
{
  "ios": {
    "entitlements": {
      "com.apple.developer.networking.wifi-info": true,
      "com.apple.developer.applesignin": ["Default"]
    }
  }
}
```

**Auto-managed entitlements:**

- App Groups (synced from main app for widget, share, clip, bg-download)
- App Clip Parent (for clip type)

### `ios.infoPlist`

**Type:** `Record<string, any>`

Custom Info.plist entries. Deep merged with type-specific defaults.

```json
{
  "ios": {
    "infoPlist": {
      "CFBundleURLTypes": [
        {
          "CFBundleURLSchemes": ["myapp"]
        }
      ],
      "NSLocationWhenInUseUsageDescription": "Show nearby locations"
    }
  }
}
```

**Merge behavior:**

- Top-level keys: Custom overrides defaults
- Nested objects: Deep merged
- Arrays: Replace entirely

**Default Info.plist by type:**

| Type       | Defaults                                               |
| ---------- | ------------------------------------------------------ |
| `clip`     | `NSAppClip`, `UILaunchStoryboardName`, bundle metadata |
| `widget`   | `NSExtension` (WidgetKit), bundle metadata             |
| `stickers` | `NSExtension` (Messages), principal class              |
| `share`    | `NSExtension` (Share services), activation rules       |
| `action`   | `NSExtension` (Services), activation rules             |

### `ios.activationRules`

**Type:** `ShareExtensionActivationRule[]`

Content types this share extension accepts (only for `type: "share"`).

```json
{
  "type": "share",
  "ios": {
    "activationRules": [
      { "type": "text" },
      { "type": "url" },
      { "type": "image", "maxCount": 5 }
    ]
  }
}
```

**Activation rule types:**

- `"text"` - Plain text
- `"url"` - URLs (including web URLs)
- `"image"` - Image files
- `"video"` - Video files
- `"file"` - Generic files
- `"webpage"` - Web pages (requires `preprocessingFile`)

**Options:**

- `maxCount` (number): Maximum items (default: 1)

### `ios.preprocessingFile`

**Type:** `string`

JavaScript file for preprocessing web content (only for `type: "share"`).

```json
{
  "type": "share",
  "ios": {
    "preprocessingFile": "./preprocessing.js"
  }
}
```

**Enables:** `NSExtensionActivationSupportsWebPageWithMaxCount`

### `ios.stickerPacks`

**Type:** `StickerPack[]`

Sticker pack configuration (only for `type: "stickers"`).

```json
{
  "type": "stickers",
  "ios": {
    "stickerPacks": [
      {
        "name": "Pack 1",
        "assets": ["./stickers/sticker1.png", "./stickers/sticker2.png"]
      }
    ]
  }
}
```

### `ios.imessageAppIcon`

**Type:** `string`

Path to icon for iMessage app icon (only for `type: "stickers"`).

```json
{
  "type": "stickers",
  "ios": {
    "imessageAppIcon": "./assets/imessage-icon.png"
  }
}
```

---

## Android Platform Configuration

### `android.minSdkVersion`

**Type:** `number`

Minimum Android API level for the widget.

```json
{
  "android": {
    "minSdkVersion": 26
  }
}
```

**Default:** `26` (Android 8.0 - required for AppWidget)

**Note:** API 33+ (Android 13) recommended for Glance support

### `android.minWidth` / `android.minHeight`

**Type:** `string` (e.g., `"180dp"`)

Minimum widget dimensions. Android launcher uses these to determine widget size.

```json
{
  "android": {
    "minWidth": "180dp",
    "minHeight": "110dp"
  }
}
```

**Defaults:** `"180dp"` x `"110dp"` (small widget size)

### `android.updatePeriodMillis`

**Type:** `number`

Widget update interval in milliseconds. Minimum is 30 minutes (1800000ms).

```json
{
  "android": {
    "updatePeriodMillis": 1800000
  }
}
```

**Default:** `1800000` (30 minutes)

**Note:** For more frequent updates, use manual refresh via `widget.refresh()` from your app.

### `android.resizeMode`

**Type:** `"none"` | `"horizontal"` | `"vertical"` | `"horizontal|vertical"`

Specifies how the widget can be resized on the home screen.

```json
{
  "android": {
    "resizeMode": "horizontal|vertical"
  }
}
```

**Default:** `"horizontal|vertical"`

### `android.widgetCategory`

**Type:** `"home_screen"` | `"keyguard"` | `"searchbox"`

Where the widget can be placed.

```json
{
  "android": {
    "widgetCategory": "home_screen"
  }
}
```

**Default:** `"home_screen"`

### `android.useGlance`

**Type:** `boolean`

Use modern Glance API (Android 13+) instead of legacy AppWidget.

```json
{
  "android": {
    "useGlance": true
  }
}
```

**Default:** `true` if `minSdkVersion >= 33`, otherwise `false`

**Glance benefits:**

- Jetpack Compose declarative UI
- Better performance
- Modern Android patterns

### `android.colors`

**Type:** `Record<string, string | Color>`

Named colors using snake_case (Android convention).

```json
{
  "android": {
    "colors": {
      "accent_color": { "light": "#007AFF", "dark": "#0A84FF" },
      "background_color": { "light": "#FFFFFF", "dark": "#1C1C1E" }
    }
  }
}
```

**Note:** Use snake_case (not PascalCase like iOS). Generates `res/values/colors.xml` and `res/values-night/colors.xml`.

### `android.permissions`

**Type:** `string[]`

Android permissions required by the widget.

```json
{
  "android": {
    "permissions": ["android.permission.INTERNET"]
  }
}
```

**Common permissions:**

- `"android.permission.INTERNET"` - Network access
- `"android.permission.ACCESS_FINE_LOCATION"` - GPS location
- `"android.permission.ACCESS_COARSE_LOCATION"` - Network location

---

## Complete Examples

### Basic Widget

```json
{
  "type": "widget",
  "name": "SimpleWidget",
  "displayName": "Simple Widget",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "deploymentTarget": "14.0",
    "colors": {
      "AccentColor": "#007AFF"
    }
  }
}
```

### Advanced Widget

```json
{
  "type": "widget",
  "name": "WeatherWidget",
  "displayName": "Weather",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "deploymentTarget": "16.0",
    "bundleIdentifier": ".weather",
    "colors": {
      "AccentColor": { "light": "#007AFF", "dark": "#0A84FF" },
      "SunnyColor": { "light": "#FFB800", "dark": "#FFD60A" },
      "CloudyColor": { "light": "#8E8E93", "dark": "#98989D" },
      "RainyColor": { "light": "#5AC8FA", "dark": "#64D2FF" },
      "Background": { "light": "#FFFFFF", "dark": "#1C1C1E" },
      "TextPrimary": { "light": "#000000", "dark": "#FFFFFF" },
      "TextSecondary": { "light": "#666666", "dark": "#98989D" }
    },
    "images": {
      "Logo": "./assets/logo.png"
    },
    "frameworks": ["CoreLocation", "MapKit"],
    "entitlements": {
      "com.apple.developer.networking.wifi-info": true
    }
  }
}
```

### App Clip

```json
{
  "type": "clip",
  "name": "QuickOrder",
  "displayName": "Quick Order",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "deploymentTarget": "14.0",
    "bundleIdentifier": ".clip",
    "colors": {
      "BrandColor": "#FF6B6B"
    },
    "entitlements": {
      "com.apple.developer.applesignin": ["Default"],
      "com.apple.developer.associated-domains": ["appclips:yourapp.example.com"]
    },
    "infoPlist": {
      "NSAppClip": {
        "NSAppClipRequestEphemeralUserNotification": true,
        "NSAppClipRequestLocationConfirmation": false
      },
      "NSLocationWhenInUseUsageDescription": "Show nearby stores"
    }
  }
}
```

### iMessage Stickers

```json
{
  "type": "stickers",
  "name": "CuteStickers",
  "displayName": "Cute Stickers",
  "platforms": ["ios"],
  "ios": {
    "deploymentTarget": "10.0",
    "bundleIdentifier": ".stickers",
    "imessageAppIcon": "./assets/imessage-icon.png",
    "stickerPacks": [
      {
        "name": "Animals",
        "assets": [
          "./stickers/cat.png",
          "./stickers/dog.png",
          "./stickers/bird.png"
        ]
      },
      {
        "name": "Emojis",
        "assets": ["./stickers/happy.png", "./stickers/sad.png"]
      }
    ]
  }
}
```

### Share Extension with React Native

```json
{
  "type": "share",
  "name": "ShareToApp",
  "displayName": "Share to MyApp",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "entry": "./ShareExtension.tsx",
  "excludedPackages": [
    "expo-updates",
    "expo-dev-client",
    "@react-native-async-storage/async-storage"
  ],
  "ios": {
    "deploymentTarget": "13.0",
    "activationRules": [
      { "type": "text" },
      { "type": "url" },
      { "type": "image", "maxCount": 5 }
    ],
    "colors": {
      "BrandColor": "#FF6B6B",
      "Background": { "light": "#FFFFFF", "dark": "#000000" }
    }
  }
}
```

### Share Extension (Native Swift)

```json
{
  "type": "share",
  "name": "ShareNative",
  "displayName": "Share",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "deploymentTarget": "13.0",
    "activationRules": [{ "type": "url" }, { "type": "webpage" }],
    "preprocessingFile": "./preprocessing.js"
  }
}
```

### Android Widget

```json
{
  "type": "widget",
  "name": "WeatherWidget",
  "displayName": "Weather",
  "platforms": ["android"],
  "appGroup": "group.com.yourapp",
  "android": {
    "minSdkVersion": 26,
    "minWidth": "180dp",
    "minHeight": "110dp",
    "updatePeriodMillis": 1800000,
    "resizeMode": "horizontal|vertical",
    "widgetCategory": "home_screen",
    "useGlance": true,
    "colors": {
      "accent_color": { "light": "#007AFF", "dark": "#0A84FF" },
      "background_color": { "light": "#FFFFFF", "dark": "#1C1C1E" }
    },
    "permissions": ["android.permission.INTERNET"]
  }
}
```

### Cross-Platform Widget

```json
{
  "type": "widget",
  "name": "WeatherWidget",
  "displayName": "Weather",
  "platforms": ["ios", "android"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "deploymentTarget": "14.0",
    "colors": {
      "AccentColor": { "light": "#007AFF", "dark": "#0A84FF" }
    }
  },
  "android": {
    "minSdkVersion": 26,
    "colors": {
      "accent_color": { "light": "#007AFF", "dark": "#0A84FF" }
    }
  }
}
```

---

## Dynamic Configuration

Configuration files can export functions for dynamic config:

```javascript
// expo-target.config.js
module.exports = (config) => {
  const isDev = process.env.NODE_ENV === 'development';

  return {
    type: 'widget',
    name: 'MyWidget',
    displayName: isDev ? 'My Widget (Dev)' : 'My Widget',
    platforms: ['ios'],
    appGroup: isDev ? 'group.com.yourapp.dev' : 'group.com.yourapp',
    ios: {
      deploymentTarget: '14.0',
      colors: {
        AccentColor: isDev ? '#FF0000' : '#007AFF',
      },
    },
  };
};
```

---

## Validation

The plugin validates configuration at build time:

**Errors:**

- Missing required fields (`type`, `name`, `platforms`)
- Invalid extension type
- Invalid platform
- Invalid deployment target format
- Invalid color format
- Missing referenced files (images, icons)

**Warnings:**

- Deployment target too high for type
- Missing App Groups in main app
- Bundle identifier conflicts
- React Native not supported for type

---

## Best Practices

### Use Relative Bundle IDs

```json
// ✅ Good: Adapts to main app
{
  "ios": {
    "bundleIdentifier": ".widget"
  }
}

// ❌ Avoid: Hard-coded
{
  "ios": {
    "bundleIdentifier": "com.mycompany.myapp.widget"
  }
}
```

### Set Appropriate Deployment Targets

```json
// ✅ Good: Minimum for features
{
  "type": "widget",
  "ios": {
    "deploymentTarget": "14.0"
  }
}

// ❌ Too high: Excludes users
{
  "type": "widget",
  "ios": {
    "deploymentTarget": "18.0"
  }
}
```

### Use Semantic Color Names

```json
// ✅ Good: Semantic
{
  "colors": {
    "Primary": "#007AFF",
    "Secondary": "#5856D6",
    "Success": "#34C759",
    "Error": "#FF3B30",
    "Background": { "light": "#FFFFFF", "dark": "#000000" }
  }
}

// ❌ Avoid: Color-based
{
  "colors": {
    "Blue": "#007AFF",
    "Purple": "#5856D6"
  }
}
```

### Minimize React Native Bundle

```json
// ✅ Good: Exclude unused
{
  "entry": "./ShareExtension.tsx",
  "excludedPackages": [
    "expo-updates",
    "expo-dev-client",
    "@react-native-community/netinfo",
    "react-native-reanimated"
  ]
}
```

---

## Troubleshooting

### Config not being detected?

**Solutions:**

1. Ensure file is named `expo-target.config.*`
2. Check JSON syntax (use validator)
3. Run `npx expo prebuild -p ios --clean`

### Build errors after config change?

**Solutions:**

1. Clean build: Product → Clean Build Folder (Cmd+Shift+K)
2. Delete `ios/` and re-run prebuild
3. Check Xcode console for specific errors

### Colors not appearing?

**Solutions:**

1. Verify color format (hex, rgb, named)
2. Check color name in Swift
3. Re-run prebuild
4. Check `targets/{name}/ios/Assets.xcassets/`

---

## See Also

- [API Reference](./api-reference.md)
- [Getting Started Guide](./getting-started.md)
- [Implementation Status](../IMPLEMENTATION_STATUS.md)
