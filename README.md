# expo-targets

**Source of truth for** package overview.

<!-- doc-meta: owner=eng | last-reviewed=2026-07-30 -->

Add **share extensions**, **action extensions**, **App Clips**, **iMessage apps**, **stickers**, **wallet extensions**, and other Apple targets Expo does not ship — including React Native UIs where supported.

> **Widgets:** For new React/iOS widgets and Live Activities, prefer official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) (SDK 56+). Native/Android widgets in this library are soft-deprecated / bridge-grade. See [Widgets handoff](./docs/widgets.md).

> **Important:** Requires development builds (`npx expo run:ios`). Does not work with Expo Go.
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

### 3. Create a Share Extension (React Native)

```bash
npx create-expo-target
# Choose: Share Extension → my-share → iOS → Yes (Use React Native)
```

This creates:

```
targets/my-share/
├── expo-target.config.json   # Extension configuration
├── index.tsx                 # createTarget + RN entry
└── ios/                      # Native host (generated at prebuild)
```

### 4. Configure Metro

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withTargetsMetro } = require("expo-targets/metro");

module.exports = withTargetsMetro(getDefaultConfig(__dirname));
```

See [React Native Extensions](./docs/react-native-extensions.md).

### 5. Build & Run

```bash
npx expo prebuild
npx expo run:ios
```

### 6. Use the extension APIs

```typescript
import { close, openHostApp, getSharedData } from "expo-targets";

const data = getSharedData(); // Content shared into the extension
openHostApp("/path"); // Open the host app
close(); // Dismiss the extension
```

---

## Supported Extensions

| Type                   | iOS  | Android | Description             |
| ---------------------- | ---- | ------- | ----------------------- |
| `share`                | ✅   | 🔜      | Share extensions        |
| `action`               | ✅   | 🔜      | Action extensions       |
| `clip`                 | ✅   | —       | App Clips               |
| `stickers`             | ✅   | —       | iMessage sticker packs  |
| `messages`             | ✅   | —       | iMessage apps           |
| `wallet`               | ✅   | —       | Wallet extensions       |
| `widget`               | ✅\* | ✅†     | Home screen widgets     |
| `safari`               | 📋   | —       | Safari web extensions   |
| `notification-content` | 📋   | 🔜      | Rich notification UI    |
| `notification-service` | 📋   | 🔜      | Notification processing |
| `intent`               | 📋   | —       | Siri intents            |
| `intent-ui`            | 📋   | —       | Siri intent UI          |

**Legend:** ✅ Production ready · 📋 Config-only\* · 🔜 Planned · — Not applicable

> \*Config-only types generate the Xcode target structure but require you to write all Swift code yourself. **No new config-only types** are being added. See [Deprecations](./docs/deprecations.md).
>
> \*`widget` (iOS): soft-deprecated — prefer [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) for React widgets. †Android widgets: bridge-grade. Details: [widgets.md](./docs/widgets.md).

---

## How It Works

expo-targets uses **App Groups** to share data between your app and extensions, and (for RN extensions) a Metro + native host path to load your React tree inside the extension process.

```
┌─────────────────┐        ┌─────────────────┐
│   Your App      │        │   Extension     │
│                 │        │                 │
│  target.set()   │───────▶│  UserDefaults / │
│  getSharedData  │◀───────│  RN host        │
└─────────────────┘        └─────────────────┘
```

---

## Examples

```bash
git clone https://github.com/csark0812/expo-targets.git
cd expo-targets/apps/extensions-showcase
npm install && npx expo run:ios
```

| Example                                           | What it shows                         |
| ------------------------------------------------- | ------------------------------------- |
| [extensions-showcase](./apps/extensions-showcase) | React Native share/action extensions  |
| [clips-and-stickers](./apps/clips-and-stickers)   | App Clips + iMessage stickers         |
| [widgets-showcase](./apps/widgets-showcase)       | Native widgets (legacy / bridge path) |
| [bare-rn-share](./apps/bare-rn-share)             | Share extension on bare RN            |

See [apps/README.md](./apps/README.md) for the full list.

---

## Documentation

- **[Getting Started](./docs/getting-started.md)** — Build a React Native share extension
- **[React Native Extensions](./docs/react-native-extensions.md)** — RN runtime contract + Metro
- **[Widgets handoff](./docs/widgets.md)** — `expo-widgets` vs this library
- **[Configuration](./docs/configuration.md)** — All config options
- **[API Reference](./docs/api.md)** — JavaScript/TypeScript API
- **[Deprecations](./docs/deprecations.md)** — Soft-deprecate and freeze policy

---

## Workflows

### Expo Managed (Recommended)

```bash
npx expo prebuild
npx expo run:ios
```

### Bare React Native

```bash
npx expo-targets sync
cd ios && pod install
npx react-native run-ios
```

---

## API at a Glance

```typescript
import { createTarget, close, openHostApp, getSharedData } from "expo-targets";

// RN extension entry
export const share = createTarget<"share">("MyShare", ShareExtension);

const data = getSharedData();
openHostApp("/inbox");
close();
```

Shared storage (widgets and other targets):

```typescript
const target = createTarget("MyTarget");
target.setData({ key: "value" });
target.refresh();
```

---

## Contributing

Contributions welcome. See [AGENTS.md](./AGENTS.md) for agent/docs conventions.

## License

MIT

## Credits

Inspired by [@bacons/apple-targets](https://github.com/EvanBacon/expo-apple-targets) and [expo-share-extension](https://github.com/MaxAst/expo-share-extension).

Widget-related prior art: official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) (preferred for React/iOS widgets today) and community [bittingz/expo-widgets](https://github.com/bittingz/expo-widgets) (historical inspiration only — not the Expo SDK package).
