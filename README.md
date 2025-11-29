# expo-targets

Add **iOS widgets**, **App Clips**, **iMessage stickers**, and **share extensions** to your Expo app — no native experience required.

> **⚠️ Important:** Requires development builds (`npx expo run:ios`). Does not work with Expo Go.
>
> **Prerequisites:** macOS, Xcode 14+, Expo SDK 50+, iOS 14+. [Full requirements →](./docs/getting-started.md#prerequisites)

## Quick Start

### 1. Install

```bash
npm install expo-targets
```

### 2. Configure `app.json`

```json
{
  "expo": {
    "plugins": ["expo-targets"],
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.yourcompany.yourapp"
        ]
      }
    }
  }
}
```

> **Why App Groups?** App Groups enable data sharing between your main app and extensions. The ID must start with `group.` — convention is `group.{your.bundle.identifier}`.

### 3. Create a Widget

```bash
npx create-expo-target
# Choose: Widget → my-widget → iOS
```

This creates:

```
targets/my-widget/
├── expo-target.config.json   # Widget configuration
├── index.ts                  # Pre-configured target instance
└── ios/
    └── Widget.swift          # SwiftUI widget code
```

### 4. Build & Run

```bash
npx expo prebuild
npx expo run:ios
```

> **Building a Share/Action Extension with React Native?** You'll also need to configure Metro. See [React Native Extensions](./docs/react-native-extensions.md#4-configure-metro).

### 5. Update from Your App

```typescript
// Option A: Import the generated target instance
import { myWidget } from './targets/my-widget';

myWidget.setData({ message: 'Hello from React Native!' });
myWidget.refresh();

// Option B: Create your own instance
import { createTarget } from 'expo-targets';

const myWidget = createTarget('MyWidget'); // Must match config "name" field
myWidget.setData({ message: 'Hello!' });
myWidget.refresh();
```

🎉 **That's it!** Long-press your home screen, tap **+**, search for your app, and add the widget.

---

## Supported Extensions

| Type                   | iOS | Android | Description             |
| ---------------------- | --- | ------- | ----------------------- |
| `widget`               | ✅  | ✅      | Home screen widgets     |
| `clip`                 | ✅  | —       | App Clips               |
| `stickers`             | ✅  | —       | iMessage sticker packs  |
| `messages`             | ✅  | —       | iMessage apps           |
| `share`                | ✅  | 🔜      | Share extensions        |
| `action`               | ✅  | 🔜      | Action extensions       |
| `safari`               | 📋  | —       | Safari web extensions   |
| `notification-content` | 📋  | 🔜      | Rich notification UI    |
| `notification-service` | 📋  | 🔜      | Notification processing |
| `intent`               | 📋  | —       | Siri intents            |
| `intent-ui`            | 📋  | —       | Siri intent UI          |

**Legend:** ✅ Production ready · 📋 Config-only\* · 🔜 Planned · — Not applicable

> \*Config-only types generate the Xcode target structure but require you to write all Swift code yourself. See [Configuration → Extension Types](./docs/configuration.md#extension-types-reference).

---

## How It Works

expo-targets uses **App Groups** to share data between your app and extensions:

```
┌─────────────────┐        ┌─────────────────┐
│   Your App      │        │   Widget        │
│                 │        │                 │
│  widget.set()   │───────▶│  UserDefaults   │
│  widget.refresh()        │  reads data     │
└─────────────────┘        └─────────────────┘
```

Your JavaScript code writes to shared storage, and your Swift widget reads from it. Simple.

---

## Examples

Clone the repo and explore working examples:

```bash
git clone https://github.com/csark0812/expo-targets.git
cd expo-targets/apps/widgets-showcase
npm install && npx expo run:ios
```

| Example                                           | What it shows                          |
| ------------------------------------------------- | -------------------------------------- |
| [widgets-showcase](./apps/widgets-showcase)       | Basic to advanced widgets              |
| [extensions-showcase](./apps/extensions-showcase) | React Native share/action extensions   |
| [clips-and-stickers](./apps/clips-and-stickers)   | App Clips + iMessage stickers          |
| [bare-rn-widgets](./apps/bare-rn-widgets)         | Adding widgets to existing RN projects |

See [apps/README.md](./apps/README.md) for the full list.

---

## Documentation

- **[Getting Started](./docs/getting-started.md)** — Build your first widget in 5 minutes
- **[Configuration](./docs/configuration.md)** — All config options explained
- **[API Reference](./docs/api.md)** — JavaScript/TypeScript API
- **[React Native Extensions](./docs/react-native-extensions.md)** — Using RN in share/action extensions

---

## Workflows

### Expo Managed (Recommended)

Best for most projects. Expo manages your native `ios/` folder via prebuild:

```bash
npx expo prebuild
npx expo run:ios
```

Use this if:

- Starting a new project
- Your `ios/` folder is generated (not in git)
- You use `expo prebuild` regularly

### Bare React Native

For existing projects with a custom `ios/` folder you maintain manually:

```bash
npx expo-targets sync    # Add targets to existing ios/ folder
cd ios && pod install
npx react-native run-ios
```

Use this if:

- You have an existing React Native project with native modifications
- Your `ios/` folder is committed to git
- You can't use `expo prebuild` (it would overwrite your changes)

---

## API at a Glance

```typescript
import { createTarget, refreshAllTargets } from 'expo-targets';

// Create a target instance
const widget = createTarget('MyWidget');

// Storage
widget.set('key', value); // Set a single value
widget.get<T>('key'); // Get a value
widget.setData({ key: value }); // Set multiple values
widget.getData<T>(); // Get all data
widget.clear(); // Clear all data

// Lifecycle
widget.refresh(); // Refresh this widget
refreshAllTargets(); // Refresh all widgets
```

For share/action extensions:

```typescript
import { close, openHostApp, getSharedData } from 'expo-targets';

const data = getSharedData(); // Get shared content
openHostApp('/path'); // Open main app
close(); // Close extension
```

---

## Contributing

Contributions welcome! This project is actively maintained.

## License

MIT

## Credits

Inspired by [@bacons/apple-targets](https://github.com/EvanBacon/expo-apple-targets), [expo-widgets](https://github.com/bittingz/expo-widgets), and [expo-share-extension](https://github.com/MaxAst/expo-share-extension).
