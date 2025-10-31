# expo-targets

Add iOS widgets, App Clips, iMessage stickers, share extensions, and other native extensions to your Expo app.

> **Status**: Production-ready for iOS. Android support coming soon.

## Features

- 🎯 **Multiple Target Types**: Widgets, App Clips, iMessage stickers, share extensions
- 📦 **Simple JSON Config**: Define targets with `expo-target.config.json`
- 🔄 **Data Sharing**: Built-in storage for communication between app and extensions
- ⚛️ **React Native Support**: Optional RN rendering in share/action/clip extensions
- 🎨 **Asset Management**: Automatic color and image asset generation
- 🚀 **CLI Tool**: Scaffold new targets with `npx create-target`
- 🔧 **Xcode Integration**: Full Xcode project manipulation for seamless native builds

## Quick Start

### Installation

```bash
bun add expo-targets
# or npm install expo-targets
```

### 1. Configure App Groups

Add App Groups to `app.json` for data sharing between app and extensions:

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

Or manually create `targets/my-widget/expo-target.config.json`:

```json
{
  "type": "widget",
  "name": "MyWidget",
  "displayName": "My Widget",
  "platforms": ["ios"],
  "appGroup": "group.com.yourcompany.yourapp",
  "ios": {
    "deploymentTarget": "14.0",
    "colors": {
      "AccentColor": { "light": "#007AFF", "dark": "#0A84FF" },
      "BackgroundColor": { "light": "#FFFFFF", "dark": "#1C1C1E" }
    }
  }
}
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
            Text(entry.message)
                .foregroundColor(Color("AccentColor"))
        }
        .containerBackground(Color("BackgroundColor"), for: .widget)
    }
}

struct Provider: TimelineProvider {
    let appGroup = "group.com.yourcompany.yourapp"

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), message: "Loading...")
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        completion(SimpleEntry(date: Date(), message: "Snapshot"))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let defaults = UserDefaults(suiteName: appGroup)
        let message = defaults?.string(forKey: "message") ?? "No data"
        let entry = SimpleEntry(date: Date(), message: message)

        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let message: String
}
```

### 3. Use in Your App

Create `targets/my-widget/index.ts`:

```typescript
import { createTarget } from 'expo-targets';

export const myWidget = createTarget('MyWidget');
```

Import and use in your app:

```typescript
import { myWidget } from './targets/my-widget';

function updateWidget() {
  myWidget.setData({ message: 'Hello Widget!' });
  myWidget.refresh();
}
```

### 4. Build Your App

```bash
npx expo prebuild -p ios --clean
npx expo run:ios
```

## Supported Target Types

| Type                   | iOS | Description                |
| ---------------------- | --- | -------------------------- |
| `widget`               | ✅  | Home screen widgets        |
| `clip`                 | ✅  | App Clips                  |
| `stickers`             | ✅  | iMessage sticker packs     |
| `share`                | ✅  | Share extensions           |
| `action`               | ✅  | Action extensions          |
| `intent`               | 📝  | Siri intents               |
| `notification-content` | 📝  | Notification content       |
| `notification-service` | 📝  | Notification service       |
| `safari`               | 📝  | Safari extensions          |
| _...and more_          | 📝  | Full iOS extension support |

✅ Implemented | 📝 Planned

## API Reference

### Target Instance

```typescript
import { createTarget } from 'expo-targets';

const widget = createTarget('WidgetName');

// Storage methods
widget.set(key: string, value: any): void
widget.get<T>(key: string): T | null
widget.remove(key: string): void
widget.clear(): void

// Batch operations
widget.setData(data: Record<string, any>): void
widget.getData<T>(): T

// Lifecycle
widget.refresh(): void  // Refresh this specific target
```

### Utility Functions

```typescript
import {
  refreshAllTargets,
  clearSharedData,
  close,
  openHostApp,
  getSharedData,
} from 'expo-targets';

// Refresh all widgets/controls
refreshAllTargets();

// Clear all data for an app group
clearSharedData('group.com.yourapp');

// Extension functions (share, action, clip only)
close(); // Close extension
openHostApp('/path'); // Open main app with deep link
const data = getSharedData(); // Get shared content
```

### Storage Class

```typescript
import { AppGroupStorage } from 'expo-targets';

const storage = new AppGroupStorage('group.com.yourapp');

storage.set(key, value);
storage.get<T>(key);
storage.remove(key);
storage.clear();
storage.setData(data);
storage.getData<T>();
storage.getKeys();
storage.refresh(targetName?);
```

## Configuration Reference

### Basic Structure

`targets/{name}/expo-target.config.json`:

```json
{
  "type": "widget",
  "name": "MyWidget",
  "displayName": "My Widget",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    // iOS-specific config
  }
}
```

### Required Fields

- `type`: Extension type (`widget`, `clip`, `stickers`, `share`, `action`, etc.)
- `name`: Target identifier (PascalCase recommended)
- `platforms`: Array of supported platforms (`["ios"]`)
- `appGroup`: App Group for data sharing (must start with `group.`)

### Optional Fields

- `displayName`: Human-readable name shown in UI
- `entry`: React Native entry point (for share/action/clip with RN)
- `excludedPackages`: Expo packages to exclude from RN bundle

### iOS Configuration

```json
{
  "ios": {
    "deploymentTarget": "14.0",
    "bundleIdentifier": "com.yourapp.widget",
    "colors": {
      "AccentColor": "#007AFF",
      "Background": { "light": "#FFFFFF", "dark": "#000000" }
    },
    "images": {
      "Logo": "./assets/logo.png"
    },
    "frameworks": ["CoreLocation", "MapKit"],
    "entitlements": {
      "com.apple.developer.networking.wifi-info": true
    },
    "infoPlist": {
      "NSLocationWhenInUseUsageDescription": "Show nearby locations"
    }
  }
}
```

## Examples

See [apps/](./apps/) for complete examples:

- **clip-advanced**: App Clip with URL handling
- **imessage-stickers**: iMessage sticker pack
- **share-extension**: Share extension with React Native
- **widget-interactive**: Advanced weather widget
- **multi-target**: Multiple targets in one app

## Documentation

- [Getting Started](./docs/getting-started.md) - Step-by-step guide
- [API Reference](./docs/api-reference.md) - Complete API documentation
- [Config Reference](./docs/config-reference.md) - Configuration options
- [Architecture](./docs/ARCHITECTURE.md) - How it works
- [Implementation Status](./IMPLEMENTATION_STATUS.md) - What's implemented

## Troubleshooting

### Widget not appearing?

1. Run `npx expo prebuild -p ios --clean`
2. Check Xcode project for target
3. Verify `Info.plist` exists in target directory

### Widget not updating?

1. Verify App Group IDs match exactly in:
   - `app.json` entitlements
   - `expo-target.config.json` appGroup
   - Swift code `UserDefaults(suiteName:)`
2. Call `widget.refresh()` after setting data
3. Test on physical device (simulators cache aggressively)

### Build errors?

1. Clean build folder: Product → Clean Build Folder (Cmd+Shift+K)
2. Delete `ios/` and re-run prebuild
3. Check deployment target is appropriate for extension type

## Contributing

Contributions welcome! This project is in active development.

## License

MIT

## Credits

Inspired by:

- [@bacons/apple-targets](https://github.com/EvanBacon/expo-apple-targets)
- [expo-widgets](https://github.com/bittingz/expo-widgets)
- [expo-share-extension](https://github.com/MaxAst/expo-share-extension)
