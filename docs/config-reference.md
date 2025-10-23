# Configuration Reference

Complete reference for configuring expo-targets extensions using the `defineTarget()` API.

## Overview

expo-targets uses a TypeScript-first configuration approach where you define targets in `index.ts` files within your `targets/` directory. The configuration is parsed at build time using Babel AST parsing.

### File Structure

```
your-app/
├── targets/
│   ├── my-widget/
│   │   ├── index.ts          ← Configuration + Runtime API
│   │   └── ios/
│   │       └── Widget.swift
│   └── another-widget/
│       ├── index.ts
│       └── ios/
│           └── Widget.swift
└── app.json
```

### Basic Pattern

Each target directory contains an `index.ts` file that:

1. Defines the target configuration for the build plugin
2. Exports a runtime Target instance for your app to use
3. Optionally exports TypeScript types for type-safe data

```typescript
// targets/my-widget/index.ts
import { defineTarget } from 'expo-targets';

export const MyWidget = defineTarget({
  name: 'my-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  displayName: 'My Widget',
  platforms: {
    ios: {
      /* config */
    },
  },
});

export type MyWidgetData = {
  // Your data types
};
```

---

## Configuration Schema

### Root Level

#### `name` (required)

**Type:** `string`

Target identifier used internally. Must match the directory name.

```typescript
name: 'my-widget'; // For targets/my-widget/
```

**Rules:**

- Must match directory name exactly
- Used as Xcode target name (sanitized)
- Used as widget `kind` in iOS
- Cannot contain spaces (hyphens and underscores OK)

#### `appGroup` (required)

**Type:** `string`

App Group identifier for shared data storage between main app and extension.

```typescript
appGroup: 'group.com.yourcompany.yourapp';
```

**Rules:**

- Must start with `group.`
- Must match App Group in `app.json` entitlements
- Must be registered in Apple Developer Portal for physical devices
- Used by `UserDefaults(suiteName:)` in Swift code

#### `type` (required)

**Type:** `ExtensionType`

Extension type. Determines product type, frameworks, and Info.plist configuration.

```typescript
type: 'widget'; // or 'clip', 'imessage', 'share', etc.
```

**Available types:**

| Type                      | iOS Support | Description                        |
| ------------------------- | ----------- | ---------------------------------- |
| `widget`                  | iOS 14+     | Home screen widgets                |
| `clip`                    | iOS 14+     | App Clips                          |
| `imessage`                | iOS 10+     | iMessage sticker packs             |
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

#### `displayName` (optional)

**Type:** `string`

Human-readable name shown in UI (widget gallery, extension picker, etc.).

```typescript
displayName: 'My Awesome Widget';
```

**Default:** Uses `name` if not specified

**Where it appears:**

- Widget gallery
- Home screen widget configuration
- Extension picker sheets
- App Store listing

#### `platforms` (required)

**Type:** `{ ios?: IOSTargetConfig; android?: AndroidTargetConfig }`

Platform-specific configuration.

```typescript
platforms: {
  ios: {
    // iOS configuration
  },
  android: {
    // Android configuration (coming soon)
  },
}
```

---

## iOS Platform Configuration

### `deploymentTarget` (optional)

**Type:** `string`

Minimum iOS/iPadOS version required for this extension.

```typescript
ios: {
  deploymentTarget: '14.0';
}
```

**Default:** `'18.0'` (package default)

**Recommendations by type:**

- `widget`: `'14.0'` (widgets introduced)
- `clip`: `'14.0'` (App Clips introduced)
- `imessage`: `'10.0'` (iMessage apps introduced)
- `share`: `'8.0'` (extensions introduced)
- `notification-content`: `'10.0'` (rich notifications)

### `bundleIdentifier` (optional)

**Type:** `string`

Bundle identifier for the extension.

```typescript
// Relative (appended to main app bundle ID)
bundleIdentifier: '.widget';
// Result: com.yourcompany.yourapp.widget

// Absolute
bundleIdentifier: 'com.yourcompany.customwidget';
// Result: com.yourcompany.customwidget
```

**Default:** `.{name}` (e.g., `.mywidget`)

**Rules:**

- Relative: Starts with `.` → appended to main bundle ID
- Absolute: No leading `.` → used as-is
- Must be unique across all targets
- Must be registered in Apple Developer Portal for physical devices

### `displayName` (optional)

**Type:** `string`

Platform-specific display name (overrides root `displayName` for iOS).

```typescript
ios: {
  displayName: 'iOS Widget Name';
}
```

### `icon` (optional)

**Type:** `string`

Path to icon file for the extension.

```typescript
ios: {
  icon: './assets/widget-icon.png';
}
```

**Requirements:**

- Relative path from project root
- PNG format recommended
- Automatically added to `Assets.xcassets`
- Supports @2x, @3x naming conventions

### `colors` (optional)

**Type:** `Record<string, string | Color>`

Named colors for use in extension UI. Automatically generates color sets in `Assets.xcassets`.

```typescript
ios: {
  colors: {
    // Simple color
    $accent: '#007AFF',

    // Light/dark mode
    background: {
      light: '#FFFFFF',
      dark: '#1C1C1E'
    },

    // Alternative syntax
    primary: {
      color: '#007AFF',
      darkColor: '#0A84FF'
    },

    // RGB/RGBA
    warning: 'rgb(255, 149, 0)',
    error: 'rgba(255, 59, 48, 0.8)',

    // Named colors
    success: 'green',
  }
}
```

**Color formats:**

- Hex: `'#RGB'`, `'#RRGGBB'`, `'#RRGGBBAA'`
- RGB: `'rgb(r, g, b)'`
- RGBA: `'rgba(r, g, b, a)'`
- Named: CSS color names (`'red'`, `'blue'`, etc.)

**Usage in Swift:**

```swift
Color("$accent")
Color("background")
```

**Notes:**

- Names with `$` prefix: prefix preserved in asset name
- Names without prefix: used as-is
- Generated into `targets/{name}/ios/Assets.xcassets/{name}.colorset/`

### `images` (optional)

**Type:** `Record<string, string>`

Named images for extension assets. Automatically adds to `Assets.xcassets`.

```typescript
ios: {
  images: {
    logo: './assets/logo.png',
    banner: './assets/banner.png',
    icon: './assets/icon.png',
  }
}
```

**Requirements:**

- Relative paths from project root
- Supports @2x, @3x naming conventions
- PNG, JPEG, PDF supported

**Usage in Swift:**

```swift
Image("logo")
Image("banner")
```

### `frameworks` (optional)

**Type:** `string[]`

Additional frameworks to link. Auto-detected based on `type`, but can add more.

```typescript
ios: {
  frameworks: ['CoreLocation', 'MapKit'];
}
```

**Default frameworks by type:**

| Type             | Default Frameworks                                  |
| ---------------- | --------------------------------------------------- |
| `widget`         | `WidgetKit`, `SwiftUI`, `ActivityKit`, `AppIntents` |
| `imessage`       | `Messages`                                          |
| `share`          | `Social`, `MobileCoreServices`                      |
| `clip`           | (inherits from main app)                            |
| `notification-*` | `UserNotifications`                                 |
| Others           | (type-specific)                                     |

**Common additions:**

- `CoreLocation`: Location services
- `MapKit`: Maps
- `StoreKit`: In-app purchases
- `AVFoundation`: Audio/video
- `CoreData`: Database

### `entitlements` (optional)

**Type:** `Record<string, any>`

Custom entitlements for the extension.

```typescript
ios: {
  entitlements: {
    'com.apple.security.application-groups': [
      'group.com.yourapp.widgets'
    ],
    'com.apple.developer.networking.wifi-info': true,
  }
}
```

**Auto-managed entitlements:**

| Type                      | Auto-Added Entitlements                                                |
| ------------------------- | ---------------------------------------------------------------------- |
| `widget`, `share`, `clip` | App Groups (synced from main app)                                      |
| `clip`                    | App Clip Parent (`com.apple.developer.parent-application-identifiers`) |
| `bg-download`             | App Groups (synced)                                                    |

**Notes:**

- App Groups automatically synced from main app for widget, clip, share, bg-download types
- Custom entitlements merged with auto-detected ones
- Must be enabled in Apple Developer Portal for physical devices

### `buildSettings` (optional)

**Type:** `Record<string, string>`

Custom Xcode build settings.

```typescript
ios: {
  buildSettings: {
    'SWIFT_VERSION': '5.0',
    'IPHONEOS_DEPLOYMENT_TARGET': '14.0',
    'ENABLE_BITCODE': 'NO',
  }
}
```

**Common settings:**

- `SWIFT_VERSION`: Swift language version
- `IPHONEOS_DEPLOYMENT_TARGET`: Deployment target
- `ENABLE_BITCODE`: Bitcode support
- `GCC_PREPROCESSOR_DEFINITIONS`: Preprocessor macros
- `OTHER_SWIFT_FLAGS`: Additional Swift compiler flags

**Notes:**

- Merged with plugin-generated settings
- Custom settings take precedence
- Some settings auto-inherited from main app:
  - `SWIFT_VERSION`
  - `TARGETED_DEVICE_FAMILY`
  - `CLANG_ENABLE_MODULES`

### `useReactNative` (optional)

**Type:** `boolean`

Enable React Native rendering in the extension.

```typescript
ios: {
  useReactNative: true;
}
```

**Default:** `false`

**Supported types:**

- `share` ✅
- `action` ✅
- `clip` ✅
- `widget` ❌ (use SwiftUI)
- `imessage` ❌ (use native stickers)

**Requirements:**

1. Create entry file: `index.{targetName}.js`
2. Wrap Metro config with `withTargetsMetro`
3. Build in Release mode (Debug not supported)

**Example:**

```typescript
// targets/share-ext/index.ts
export const ShareExt = defineTarget({
  name: 'share-ext',
  appGroup: 'group.com.app',
  type: 'share',
  platforms: {
    ios: {
      useReactNative: true,
      excludedPackages: ['expo-updates', 'expo-dev-client'],
    },
  },
});
```

```javascript
// index.share-ext.js
import { AppRegistry } from 'react-native';
import ShareExtension from './src/ShareExtension';

AppRegistry.registerComponent('shareExt', () => ShareExtension);
```

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withTargetsMetro } = require('expo-targets/metro');

module.exports = withTargetsMetro(getDefaultConfig(__dirname));
```

### `excludedPackages` (optional)

**Type:** `string[]`

Packages to exclude from React Native bundle (reduces size).

```typescript
ios: {
  useReactNative: true,
  excludedPackages: [
    'expo-updates',
    'expo-dev-client',
    '@react-native-community/netinfo',
    'react-native-reanimated',
  ]
}
```

**Only applies when `useReactNative: true`**

**Common exclusions:**

- `expo-updates`: OTA updates (not needed in extensions)
- `expo-dev-client`: Development tools
- `@react-native-community/netinfo`: Network monitoring
- `react-native-reanimated`: Animations (if not used)
- `@react-native-async-storage/async-storage`: Storage (use App Groups instead)

---

## Android Platform Configuration

> **Status:** Coming soon

```typescript
platforms: {
  android: {
    resourceName: 'my_widget',
    // More options coming
  }
}
```

---

## Complete Examples

### Basic Widget

```typescript
import { defineTarget } from 'expo-targets';

export const SimpleWidget = defineTarget({
  name: 'simple-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  displayName: 'Simple Widget',
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      colors: {
        $accent: '#007AFF',
      },
    },
  },
});

export type SimpleWidgetData = {
  message: string;
};
```

### Advanced Widget with Assets

```typescript
import { defineTarget } from 'expo-targets';

export const AdvancedWidget = defineTarget({
  name: 'advanced-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  displayName: 'Advanced Widget',
  platforms: {
    ios: {
      deploymentTarget: '16.0',
      bundleIdentifier: '.advancedwidget',
      icon: './assets/widget-icon.png',

      colors: {
        $primary: '#007AFF',
        $secondary: '#5856D6',
        $background: {
          light: '#F2F2F7',
          dark: '#1C1C1E',
        },
        $text: {
          light: '#000000',
          dark: '#FFFFFF',
        },
      },

      images: {
        logo: './assets/logo.png',
        placeholder: './assets/placeholder.png',
      },

      frameworks: ['CoreLocation', 'MapKit'],

      buildSettings: {
        SWIFT_VERSION: '5.0',
      },
    },
  },
});

export type AdvancedWidgetData = {
  title: string;
  subtitle: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  lastUpdated: number;
};
```

### App Clip

```typescript
import { defineTarget } from 'expo-targets';

export const QuickOrder = defineTarget({
  name: 'quick-order',
  appGroup: 'group.com.yourapp',
  type: 'clip',
  displayName: 'Quick Order',
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      bundleIdentifier: '.clip',

      colors: {
        $brand: '#FF6B6B',
      },

      entitlements: {
        'com.apple.developer.applesignin': ['Default'],
      },
    },
  },
});
```

### iMessage Stickers

```typescript
import { defineTarget } from 'expo-targets';

export const CuteStickers = defineTarget({
  name: 'cute-stickers',
  appGroup: 'group.com.yourapp',
  type: 'imessage',
  displayName: 'Cute Stickers',
  platforms: {
    ios: {
      deploymentTarget: '10.0',
      bundleIdentifier: '.stickers',
      icon: './assets/sticker-icon.png',
    },
  },
});
```

### Share Extension with React Native

```typescript
import { defineTarget } from 'expo-targets';

export const ShareToApp = defineTarget({
  name: 'share-to-app',
  appGroup: 'group.com.yourapp',
  type: 'share',
  displayName: 'Share to MyApp',
  platforms: {
    ios: {
      deploymentTarget: '13.0',
      useReactNative: true,
      excludedPackages: [
        'expo-updates',
        'expo-dev-client',
        '@react-native-async-storage/async-storage',
      ],

      colors: {
        $brand: '#FF6B6B',
        $background: {
          light: '#FFFFFF',
          dark: '#000000',
        },
      },
    },
  },
});

export type ShareData = {
  url: string;
  title?: string;
  timestamp: number;
};
```

### Multiple Targets

```typescript
// targets/index.ts
export { HelloWidget } from './hello-widget';
export { DashboardWidget } from './dashboard-widget';
export { ShareExtension } from './share-extension';

export type { HelloWidgetData } from './hello-widget';
export type { DashboardData } from './dashboard-widget';
export type { ShareData } from './share-extension';
```

---

## Computed Configuration

Configuration can be computed at build time:

```typescript
import { defineTarget } from 'expo-targets';

const isDev = process.env.NODE_ENV === 'development';

export const MyWidget = defineTarget({
  name: 'my-widget',
  appGroup: isDev ? 'group.com.yourapp.dev' : 'group.com.yourapp',
  type: 'widget',
  displayName: isDev ? 'My Widget (Dev)' : 'My Widget',
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      colors: {
        $accent: isDev ? '#FF0000' : '#007AFF',
      },
    },
  },
});
```

---

## Configuration Validation

The plugin validates configuration at build time:

**Required fields:**

- `name` must match directory name
- `appGroup` must be valid App Group identifier
- `type` must be valid extension type
- `platforms` must have at least one platform

**Warnings:**

- `deploymentTarget` too high for target type
- Missing App Groups in main app entitlements
- Bundle identifier conflicts
- Unsupported `useReactNative` for target type

---

## Best Practices

### Use Relative Bundle IDs

```typescript
// ✅ Good: Adapts to main app bundle ID
bundleIdentifier: '.widget';

// ❌ Avoid: Hard-coded, requires manual updates
bundleIdentifier: 'com.mycompany.myapp.widget';
```

### Set Appropriate Deployment Targets

```typescript
// ✅ Good: Minimum required for features
deploymentTarget: '14.0'; // Widgets

// ❌ Too high: Excludes older devices unnecessarily
deploymentTarget: '18.0';
```

### Organize Colors Semantically

```typescript
// ✅ Good: Semantic naming
colors: {
  $primary: '#007AFF',
  $secondary: '#5856D6',
  $success: '#34C759',
  $error: '#FF3B30',
  $background: { light: '#FFFFFF', dark: '#000000' },
}

// ❌ Avoid: Color-based naming
colors: {
  blue: '#007AFF',
  purple: '#5856D6',
  // Colors might change but names are fixed
}
```

### Exclude Unnecessary Packages

```typescript
// ✅ Good: Minimal bundle
useReactNative: true,
excludedPackages: ['expo-updates', 'expo-dev-client']

// ❌ Avoid: Large bundle
useReactNative: true,
excludedPackages: []
```

### Export Types for Data

```typescript
// ✅ Good: Type-safe data operations
export type WidgetData = {
  message: string;
  count: number;
};

// Usage: Widget.setData<WidgetData>(data)
```

---

## Troubleshooting

### Config not being detected?

**Causes:**

- File not named `index.ts` or `index.tsx`
- Not using `defineTarget()` function
- Syntax errors in config file

**Solutions:**

1. Ensure file is `targets/{name}/index.ts`
2. Use `defineTarget()` from `expo-targets`
3. Check for TypeScript errors
4. Run `npx expo prebuild -p ios --clean`

### Bundle ID conflicts?

**Causes:**

- Multiple targets with same bundle ID
- Absolute bundle IDs conflicting with main app

**Solutions:**

1. Use unique relative bundle IDs: `.widget1`, `.widget2`
2. Check Apple Developer Portal for conflicts
3. Review all target `bundleIdentifier` settings

### Colors not appearing in widget?

**Causes:**

- Invalid color format
- Typo in color name
- Colors not generated in Assets.xcassets

**Solutions:**

1. Verify color format (hex, rgb, named)
2. Check color name in Swift: `Color("colorName")`
3. Re-run `npx expo prebuild -p ios --clean`
4. Check `targets/{name}/ios/Assets.xcassets/`

### React Native extensions not working?

**Causes:**

- Missing `index.{targetName}.js` entry file
- Metro config not wrapped
- Unsupported target type

**Solutions:**

1. Create entry file: `index.{targetName}.js`
2. Wrap Metro: `withTargetsMetro(getDefaultConfig(__dirname))`
3. Build in Release mode
4. Verify type supports React Native (share, action, clip)

---

## Migration from JSON Config

### Before (JSON config - not supported)

```javascript
// expo-target.config.js
module.exports = {
  type: 'widget',
  displayName: 'My Widget',
  platforms: { ios: {} },
};
```

### After (TypeScript with defineTarget)

```typescript
// index.ts
import { defineTarget } from 'expo-targets';

export const MyWidget = defineTarget({
  name: 'my-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  displayName: 'My Widget',
  platforms: { ios: {} },
});
```

**Benefits:**

- Single source of truth (config + runtime)
- Type-safe configuration
- IDE autocomplete
- Runtime API included
- Export data types
