# expo-targets

Add iOS widgets, App Clips, iMessage stickers, and other native extensions to your Expo app with a simple, type-safe API.

> **Status**: iOS widget support is production-ready. App Clips and iMessage stickers are supported. Share/action extensions planned. Android support coming soon.

## Features

- 🎯 **Multiple Target Types**: iOS widgets, App Clips, iMessage stickers, and more
- 📦 **Simple TypeScript API**: Define targets with type-safe `defineTarget()` function
- 🔄 **Data Sharing**: Built-in `TargetStorage` for communication between app and extensions
- ⚛️ **React Native Support**: Optional RN rendering in compatible extensions
- 🎨 **Asset Management**: Automatic color and image asset generation
- 🚀 **CLI Tool**: Scaffold new targets with `npx create-target`
- 🔧 **Xcode Integration**: Full Xcode project manipulation for seamless native builds
- 📱 **iOS First**: Production-ready iOS support with Android architecture prepared

## Quick Start

### Installation

```bash
bun add expo-targets
# or npm install expo-targets
```

### 1. Configure App Groups

Add App Groups to your `app.json` for data sharing:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.yourcompany.yourapp"
        ]
      }
    },
    "plugins": ["expo-targets"]
  }
}
```

### 2. Create a Widget Target

Use the CLI to scaffold:

```bash
npx create-target
```

Or manually create `targets/my-widget/index.ts`:

```typescript
import { defineTarget } from 'expo-targets';

export const MyWidget = defineTarget({
  name: 'my-widget',
  appGroup: 'group.com.yourcompany.yourapp',
  type: 'widget',
  displayName: 'My Widget',
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      colors: {
        $accent: '#007AFF',
        $background: { light: '#FFFFFF', dark: '#1C1C1E' },
      },
    },
  },
});

export type MyWidgetData = {
  message: string;
  count?: number;
};
```

Create `targets/my-widget/ios/Widget.swift`:

```swift
import WidgetKit
import SwiftUI

@main
struct MyWidget: Widget {
    let kind: String = "MyWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WidgetView(entry: entry)
        }
        .configurationDisplayName("My Widget")
        .description("A simple widget")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct WidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            Text("Hello Widget")
                .foregroundColor(Color("$accent"))
        }
    }
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), message: "Loading...")
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        completion(SimpleEntry(date: Date(), message: "Snapshot"))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = SimpleEntry(date: Date(), message: "Hello")
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let message: String
}
```

### 3. Use Your Widget in Your App

Import and use your widget instance directly:

```typescript
import { MyWidget } from './targets/my-widget';

function updateWidget() {
  // Simple key-value storage
  MyWidget.set('message', 'Hello from app!');
  MyWidget.set('count', 42);

  // Or type-safe data object
  MyWidget.setData<MyWidgetData>({
    message: 'Hello Widget!',
    count: 42,
  });

  // Refresh widget to show new data
  MyWidget.refresh();
}

function readWidget() {
  const message = MyWidget.get('message');
  const data = MyWidget.getData<MyWidgetData>();
  console.log('Message:', message);
  console.log('Data:', data);
}
```

In your widget Swift code, read from the App Group:

```swift
func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    let defaults = UserDefaults(suiteName: "group.com.yourcompany.yourapp")
    let message = defaults?.string(forKey: "message") ?? "No data"
    let entry = SimpleEntry(date: Date(), message: message)

    // Update every 15 minutes
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
    let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
    completion(timeline)
}
```

### 4. Build Your App

```bash
npx expo prebuild -p ios --clean
npx expo run:ios
```

## Supported Target Types

| Type                   | iOS | Android | Description                             |
| ---------------------- | --- | ------- | --------------------------------------- |
| `widget`               | ✅  | 🔜      | Home screen widgets                     |
| `clip`                 | ✅  | 🔜      | App Clips (lightweight app experiences) |
| `imessage`             | ✅  | -       | iMessage sticker packs                  |
| `share`                | 📝  | 🔜      | Share extensions                        |
| `action`               | 📝  | 🔜      | Action extensions                       |
| `intent`               | 📝  | -       | Siri intents                            |
| `notification-service` | 📝  | 🔜      | Rich notifications                      |
| `safari`               | 📝  | -       | Safari extensions                       |
| _...and more_          | 📝  | 🔜      | Full iOS/Android extension support      |

✅ Implemented | 📝 Planned | 🔜 Coming Soon

## React Native in Extensions

Some extension types support React Native rendering:

```javascript
// targets/share-extension/expo-target.config.js
module.exports = {
  type: 'share',
  platforms: {
    ios: {
      useReactNative: true,
      excludedPackages: ['expo-updates', 'expo-dev-client'],
    },
  },
};
```

Create `index.share.js`:

```javascript
import { AppRegistry } from 'react-native';
import ShareExtension from './src/ShareExtension';

AppRegistry.registerComponent('shareExtension', () => ShareExtension);
```

Wrap your Metro config:

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withTargetsMetro } = require('expo-targets/metro');

module.exports = withTargetsMetro(getDefaultConfig(__dirname));
```

## API Reference

### `defineTarget(options)`

Creates a type-safe target instance with built-in data storage and lifecycle methods.

```typescript
import { defineTarget } from 'expo-targets';

export const MyWidget = defineTarget({
  name: 'my-widget', // Required: Target identifier
  appGroup: 'group.com.yourapp', // Required: App Group for shared data
  type: 'widget', // Required: Extension type
  displayName: 'My Widget', // Optional: Display name
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      colors: { $accent: '#007AFF' },
      // ... iOS configuration
    },
  },
});
```

#### Target Instance Methods

```typescript
// Store individual values
MyWidget.set(key: string, value: string | number | object | array): void
MyWidget.get(key: string): string | null
MyWidget.remove(key: string): void

// Store/retrieve typed data object
MyWidget.setData<T>(data: T): void
MyWidget.getData<T>(): T | null

// Refresh widget UI
MyWidget.refresh(): void

// Direct storage access for advanced use
MyWidget.storage: AppGroupStorage
```

### Legacy API (Backward Compatible)

```typescript
import { TargetStorage, refreshAllTargets } from 'expo-targets';

// Create instance manually
const storage = new TargetStorage('group.com.yourapp', 'WidgetName');
storage.set('key', 'value');
storage.refresh();

// Refresh all targets
refreshAllTargets();
```

### Utility Functions

```typescript
import { close, openHostApp, clearSharedData } from 'expo-targets';

// Close extension (share, action extensions)
close();

// Open main app from extension with deep link
openHostApp('/path');

// Clear shared data (coming soon)
await clearSharedData();
```

## Configuration Reference

Define targets in `targets/{name}/index.ts` using `defineTarget()`:

```typescript
import { defineTarget } from 'expo-targets';

export const MyWidget = defineTarget({
  // Required fields
  name: 'my-widget', // Target identifier (matches directory name)
  appGroup: 'group.com.yourapp', // App Group for data sharing
  type: 'widget', // Extension type

  // Optional fields
  displayName: 'My Widget', // Human-readable name

  // Platform configuration
  platforms: {
    ios: {
      deploymentTarget: '14.0', // Minimum iOS version
      bundleIdentifier: '.widget', // Relative or absolute bundle ID

      // Visual assets
      icon: './assets/widget-icon.png',
      colors: {
        $accent: '#007AFF', // Single color
        background: {
          // Light/dark mode support
          light: '#FFFFFF',
          dark: '#1C1C1E',
        },
      },
      images: {
        logo: './assets/logo.png', // Named images for Assets.xcassets
      },

      // Build configuration
      frameworks: ['WidgetKit', 'SwiftUI'], // Additional frameworks
      buildSettings: {
        // Custom Xcode build settings
        SWIFT_VERSION: '5.0',
      },

      // Entitlements (App Groups auto-synced from main app)
      entitlements: {
        'com.apple.security.application-groups': ['group.com.yourapp'],
      },

      // React Native support (for share, action, clip types)
      useReactNative: false,
      excludedPackages: ['expo-updates', 'expo-dev-client'],
    },

    android: {
      // Coming soon
      resourceName: 'my_widget',
    },
  },
});

// Export type for type-safe data
export type MyWidgetData = {
  message: string;
  count?: number;
};
```

## Examples

The repository includes a complete example app:

- **apps/widget-basic**: Complete working widget with data sharing and type-safe API

See the [apps/](./apps/) directory for runnable examples.

## Project Structure

```
your-app/
├── targets/                          # All extension targets
│   ├── my-widget/
│   │   ├── index.ts                  # Target definition with defineTarget()
│   │   └── ios/
│   │       ├── Widget.swift          # Widget implementation
│   │       ├── SmallWidgetView.swift # Optional: Size-specific views
│   │       ├── MediumWidgetView.swift
│   │       └── LargeWidgetView.swift
│   ├── app-clip/
│   │   ├── index.ts
│   │   └── ios/
│   │       └── AppClip.swift
│   └── share-extension/
│       ├── index.ts
│       ├── index.share.js            # React Native entry (if useReactNative: true)
│       └── ios/
│           └── ShareViewController.swift
├── App.tsx                           # Main app (imports targets)
├── metro.config.js                   # Wrapped with withTargetsMetro (for RN extensions)
└── app.json                          # Includes expo-targets plugin
```

## How It Works

1. **Target Discovery**: Plugin scans `targets/*/index.ts` for `defineTarget()` calls
2. **Config Parsing**: Extracts configuration from `defineTarget()` arguments using Babel AST
3. **Xcode Manipulation**: Creates native targets, links Swift files, configures build settings
4. **Asset Generation**: Generates color sets and image assets in `Assets.xcassets`
5. **Entitlements**: Syncs App Groups from main app, adds target-specific entitlements
6. **Data Sharing**: Native Swift module enables `UserDefaults` sharing via App Groups
7. **Widget Refresh**: Calls `WidgetCenter` and `ControlCenter` APIs to update UI

## Troubleshooting

### Widget not appearing in widget gallery?

1. Run `npx expo prebuild -p ios --clean` to regenerate Xcode project
2. Build and run app on device/simulator
3. Check that target appears in Xcode project navigator
4. Verify `Info.plist` exists in `targets/{name}/ios/`

### Widget not updating with new data?

1. Verify App Group ID matches in `app.json` and `defineTarget()`:
   ```typescript
   // Must match exactly
   app.json: "com.apple.security.application-groups": ["group.com.yourapp"]
   index.ts: appGroup: 'group.com.yourapp'
   ```
2. Confirm you're calling `MyWidget.refresh()` after setting data
3. Test on physical device (simulators can have caching issues)
4. Check widget timeline update policy in Swift code

### Build errors in Xcode?

1. Clean build folder: **Product → Clean Build Folder** (Cmd+Shift+K)
2. Delete `ios/` directory: `rm -rf ios/ && npx expo prebuild -p ios --clean`
3. Verify deployment target is iOS 14.0+ for widgets
4. Check Swift version compatibility in build settings

### Type errors with `defineTarget`?

1. Ensure `expo-targets` is installed: `bun add expo-targets`
2. Verify TypeScript config includes `node_modules`
3. Restart TypeScript server in your editor
4. Check that types are exported: `export type MyWidgetData = {...}`

### React Native extensions not working?

1. Wrap Metro config: `withTargetsMetro(getDefaultConfig(__dirname))`
2. Create entry file: `index.{targetName}.js`
3. Set `useReactNative: true` in target config
4. Build in Release mode (Debug not supported for extensions)
5. Exclude unnecessary packages to reduce bundle size

## Contributing

This project is in active development. Contributions welcome!

## License

MIT

## Credits

Inspired by:

- [@bacons/apple-targets](https://github.com/EvanBacon/expo-apple-targets) by Evan Bacon
- [expo-widgets](https://github.com/bittingz/expo-widgets) by @bittingz
- [expo-share-extension](https://github.com/MaxAst/expo-share-extension) by MaxAst
- [expo-live-activity](https://github.com/software-mansion-labs/expo-live-activity) by Software Mansion
