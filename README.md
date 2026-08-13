# expo-targets

**Source of truth for** package overview.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-10 -->

Add **share extensions**, **action extensions**, **App Clips**, **iMessage apps**, **stickers**, **wallet extensions**, and other Apple targets that Expo does not ship. React Native UIs are supported where the platform allows them.

> **Widgets:** Native WidgetKit and Live Activities are first-class in this library. Official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) is an alternate React / Expo-UI path. Do not run both WidgetKit generators in one app. Android widgets are first-class Glance / Compose. `LiveActivity.*` on Android is an ongoing-notification helper. See [widgets.md](./docs/widgets.md) and [limits.md](./docs/limits.md).

> **Important:** You must use a development build (`npx expo run:ios`). Expo Go is not supported.
>
> **Prerequisites:** macOS, Xcode 14+, iOS 14+. **Tested on Expo SDK 57.** [Full requirements →](./docs/getting-started.md#prerequisites)

## Quick Start

### 1. Install

```bash
npm install expo-targets
```

### 2. Create a Share Extension (React Native)

```bash
npx expo-targets add
# interactive — or: npx expo-targets add share my-share
```

`expo-targets add` scaffolds the target and wires the host by default (`package.json`, config plugin, App Groups, `metro.config.js`). If wiring added `expo-targets` to `package.json`, install dependencies.

### 3. Manual host config (advanced)

If you use `--no-wire` or a dynamic `app.config.js`, add the plugin and App Groups yourself.

After `npx expo prebuild`, sealed build artifacts land in `ios/<App>/ExpoTargetsGenerated/<Product>/` (gitignored). Deepen Swift under `targets/*/ios/`. Never edit `ExpoTargetsGenerated/`.

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

> **Why App Groups?** App Groups share data between your app and extensions. The ID must start with `group.`. Convention: `group.{your.bundle.identifier}`.

### 4. Configure Metro

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withTargets } = require("expo-targets/metro");

module.exports = withTargets(getDefaultConfig(__dirname));
```

See [React Native Extensions](./docs/react-native-extensions.md). (`withTargetsMetro` is a deprecated alias.)

### 5. Build and run

```bash
npx expo-targets doctor
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

Showcase subset (common adoption path). **Full type set and maturity (~47 types):** [configuration.md](./docs/configuration.md).

| Type       | iOS  | Android | Description                          |
| ---------- | ---- | ------- | ------------------------------------ |
| `share`    | ✅   | ✅‡     | Share extensions (RN on iOS; Android dedicated Activity) |
| `action`   | ✅   | ✅‡     | Action extensions (RN on iOS; Android dedicated Activity) |
| `clip`     | ✅   | —       | App Clips (RN UI supported)          |
| `messages` | ✅   | —       | iMessage apps (RN UI supported)      |
| `stickers` | ✅   | —       | iMessage sticker packs (asset-only)  |
| `widget`   | ✅   | ✅      | Home screen widgets + Live Activities |
| `notification-service` | ✅ | ✅§ | Push mutation (Android: local NotificationCompat; FCM leftover) |
| `notification-content` | ✅ | ✅§ | Rich UI (Android: RemoteViews / A12 clamp) |

**Legend:** ✅ Production ready · 🔜 Planned · — Not applicable

> ‡Android share/action: dedicated Activities + RN `entry` host (TTI + Devicewright green — spike `android-rn-host-tti-2026-08-10.md`). Showcase mark waits on notification FCM close. §Android notifications: host-process; FCM receive wired — shade green with `FCM_*` retires this mark. Widget ownership and Android LA → ongoing-notification: [widgets.md](./docs/widgets.md), [limits.md](./docs/limits.md). Full matrix: [configuration.md](./docs/configuration.md).
>
> Wallet, Safari, Network Extension family, file providers, and the rest: [configuration.md](./docs/configuration.md). Lib floor vs Apple gates: [limits.md](./docs/limits.md). **No new orphan stubs** — [deprecations.md](./docs/deprecations.md).

---

## How It Works

expo-targets uses **App Groups** to share data between your app and extensions. For RN extensions, Metro plus a native host loads your React tree inside the extension process.

```
┌─────────────────┐        ┌─────────────────┐
│   Your App      │        │   Extension     │
│                 │        │                 │
│  setData /      │───────▶│  UserDefaults / │
│  storage.set    │        │  App Group      │
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

| Example                                 | What it shows                                                     |
| --------------------------------------- | ----------------------------------------------------------------- |
| [share](./examples/share)               | React Native share extension                                      |
| [action](./examples/action)             | React Native action extension                                     |
| [clip](./examples/clip)                 | React Native App Clip                                             |
| [messages](./examples/messages)         | React Native messages extension                                   |
| [stickers](./examples/stickers)         | Asset-only sticker pack                                           |
| [widgets](./examples/widgets)           | iOS WidgetKit + Live Activities ([widgets.md](./docs/widgets.md)) |
| [kitchen-sink](./examples/kitchen-sink) | Five primary types in one host (messages, not stickers)           |
| [trick](./examples/trick)               | Multi-target kitchen sink (Devicewright coverage host)            |

See [examples/README.md](./examples/README.md) for the full suite (~48 hosts), Devicewright coverage, and stub READMEs.

---

## Documentation

- **[Getting Started](./docs/getting-started.md)** — Build a React Native share extension
- **[React Native Extensions](./docs/react-native-extensions.md)** — RN runtime contract + Metro; [App Group OTA / eas update](./docs/react-native-extensions.md#extension-bundle-sideload-with-expo-updates)
- **[Widgets](./docs/widgets.md)** — WidgetKit / Live Activities ownership vs `expo-widgets`
- **[Configuration](./docs/configuration.md)** — All config options
- **[API Reference](./docs/api.md)** — JavaScript/TypeScript API ([`ExtensionUpdates`](./docs/api.md#extensionupdates))
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
```

Use `npx expo-targets sync --dry-run` to preview. For new projects, use managed Expo and `npx expo prebuild`.

---

## API at a Glance

```typescript
import { createTarget, close, openHostApp, getSharedData } from "expo-targets";

// RN extension entry
export const share = createTarget("MyShare", ShareExtension);

const data = getSharedData();
openHostApp("/inbox");
close();
```

Shared storage (widgets and other targets):

```typescript
const target = createTarget("MyTarget");
target.setData({ key: "value" });
// or: target.storage.set("key", "value");
target.refresh();
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) (humans) and [AGENTS.md](./AGENTS.md) (agent posture).

## License

MIT

## Credits

Builds on community Apple-target / share-extension patterns and Expo’s official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) (React/Expo-UI alternate for widgets).
