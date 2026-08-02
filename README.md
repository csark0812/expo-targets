# expo-targets

**Source of truth for** package overview.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-02 -->

Add **share extensions**, **action extensions**, **App Clips**, **iMessage apps**, **stickers**, **wallet extensions**, and other Apple targets Expo does not ship — including React Native UIs where supported.

> **Widgets:** Native WidgetKit + Live Activities are first-class in this library. Official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) is an alternative React/Expo-UI path — do not dual-generate WidgetKit in one app. Android widgets remain bridge-grade. See [widgets.md](./docs/widgets.md) and [limits.md](./docs/limits.md).

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
| `safari`               | 🧱   | —       | Safari web extensions   |
| `notification-content` | 🧱   | 🔜      | Rich notification UI    |
| `notification-service` | 🧱   | 🔜      | Notification processing |
| `intent`               | 🧱   | —       | Siri intents            |
| `intent-ui`            | 🧱   | —       | Siri intent UI          |

**Legend:** ✅ Production ready · 🧱 Scaffold + example · 🔜 Planned · — Not applicable

> Scaffold types ship Xcode wiring plus an `examples/` host; deepen Swift to the Apple principal as needed. Lib floor vs Apple gates: [limits.md](./docs/limits.md). **No new orphan stubs** — [deprecations.md](./docs/deprecations.md).
>
> \*`widget` (iOS): first-class native WidgetKit + Live Activities. †Android widgets: bridge-grade. Details: [widgets.md](./docs/widgets.md).
>
> Full Bacon-parity `ExtensionType` set: [configuration.md](./docs/configuration.md) · [migrate from `@bacons/apple-targets`](./docs/migrate-from-bacons-apple-targets.md).

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

Thin hosts live under [`examples/`](./examples/). Start with share:

```bash
git clone https://github.com/csark0812/expo-targets.git
cd expo-targets/examples/share
npm install && npx expo run:ios
```

| Example                                   | What it shows                                                     |
| ----------------------------------------- | ----------------------------------------------------------------- |
| [share](./examples/share)                 | React Native share extension                                      |
| [action](./examples/action)               | React Native action extension                                     |
| [clip](./examples/clip)                   | React Native App Clip                                             |
| [stickers](./examples/stickers)           | Asset-only sticker pack                                           |
| [widgets](./examples/widgets)             | iOS WidgetKit + Live Activities ([widgets.md](./docs/widgets.md)) |
| [messages](./examples/messages)           | React Native messages extension                                   |
| [kitchen-sink](./examples/kitchen-sink)   | Five primary types in one host (messages, not stickers)           |
| [native/share](./examples/native/share)   | Swift share + RN host                                             |
| [native/action](./examples/native/action) | Swift action + RN host                                            |
| [native/clip](./examples/native/clip)     | SwiftUI App Clip + RN host                                        |

See [examples/README.md](./examples/README.md) for Maestro vs manual coverage and Bacon-parity stubs.

---

## Documentation

- **[Getting Started](./docs/getting-started.md)** — Build a React Native share extension
- **[React Native Extensions](./docs/react-native-extensions.md)** — RN runtime contract + Metro
- **[Widgets](./docs/widgets.md)** — WidgetKit / Live Activities ownership vs `expo-widgets`
- **[Configuration](./docs/configuration.md)** — All config options
- **[API Reference](./docs/api.md)** — JavaScript/TypeScript API
- **[Deprecations](./docs/deprecations.md)** — Roadmap freeze (no orphan stubs)

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

Widget-related prior art: official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) (React/Expo-UI alternative) and community [bittingz/expo-widgets](https://github.com/bittingz/expo-widgets) (historical inspiration only).
