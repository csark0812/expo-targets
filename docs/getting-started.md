# Getting Started

**Source of truth for** first-run setup (React Native share extension).

<!-- doc-meta: owner=eng | last-reviewed=2026-08-05 -->

Build a React Native **share extension** with expo-targets.

> **Looking for widgets?** Native WidgetKit + Live Activities are first-class here — see [widgets.md](./widgets.md). Official `expo-widgets` is an alternative React/Expo-UI path (do not dual-generate).

## Prerequisites

- macOS with Xcode 14+
- **Tested on Expo SDK 57** (development builds; not Expo Go)
- iOS Simulator or device running iOS 14+

> **Device Testing Requirements**
>
> For testing on physical devices (not simulator):
>
> - Apple Developer account (free or paid)
> - App Groups capability must be enabled in your provisioning profile
> - Configure in Xcode: **Signing & Capabilities** → Add **App Groups**
>
> Simulator testing works without these requirements, but real devices require proper provisioning.

## Step 1: Install

```bash
npm install expo-targets
# or: yarn add expo-targets / bun add expo-targets
```

## Step 2: Configure Your App

Add the plugin and App Groups to your `app.json`:

```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "ios": {
      "bundleIdentifier": "com.yourcompany.myapp",
      "entitlements": {
        "com.apple.security.application-groups": ["group.com.yourcompany.myapp"]
      }
    },
    "plugins": ["expo-targets"]
  }
}
```

> **App Groups are Critical**
>
> App Groups enable data sharing between your app and extensions. IDs must match exactly or sharing fails.
>
> - Must start with `group.`
> - Convention: `group.{your.bundle.identifier}`
> - Must match in `app.json`, target config, and native code

## Step 3: Create a Share Extension

```bash
npx create-expo-target
```

Choose:

- **Type:** Share Extension
- **Name:** my-share
- **Use React Native:** Yes

This creates:

```
targets/my-share/
├── expo-target.config.json
├── index.tsx                 # createTarget + component registration
└── ios/                      # User deepen (committed)
```

After `npx expo prebuild`, sealed artifacts land in `ios/<App>/ExpoTargetsGenerated/<Product>/` (gitignored). Never edit that tree — deepen under `targets/*/ios/`.

Example config:

```json
{
  "type": "share",
  "name": "MyShare",
  "displayName": "My Share",
  "platforms": ["ios"],
  "appGroup": "group.com.yourcompany.myapp",
  "entry": "./targets/my-share/index.tsx",
  "excludedPackages": ["expo-updates", "expo-dev-client"],
  "ios": {
    "deploymentTarget": "14.0"
  }
}
```

Update the placeholder `appGroup` to match your `app.json`.

`excludedPackages` must include `expo-updates` and `expo-dev-client` so the extension host does not link packages that assume a full app process (they break extension builds).

### Naming Conventions

| Location            | Format     | Example                        | Notes                     |
| ------------------- | ---------- | ------------------------------ | ------------------------- |
| Target folder       | kebab-case | `targets/my-share/`            | Organizational            |
| Config `name` field | PascalCase | `"name": "MyShare"`            | Canonical identifier      |
| `createTarget()`    | Same name  | `createTarget('MyShare', …)`   | Must match config exactly |
| `entry`             | Path       | `./targets/my-share/index.tsx` | Relative to project root  |

## Step 4: Configure Metro

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withTargetsMetro } = require("expo-targets/metro");

module.exports = withTargetsMetro(getDefaultConfig(__dirname));
```

`withTargetsMetro` maps each target `entry` so the extension host can load the right bundle. Details: [React Native Extensions](./react-native-extensions.md).

## Step 5: Build & Run

```bash
npx expo prebuild
npx expo run:ios
```

Share a URL or text from Safari (or another app) into your extension to try it.

## Step 6: Extension APIs

```typescript
import { getSharedData, openHostApp, close } from "expo-targets";

const data = getSharedData();
if (data?.url) {
  openHostApp(`/inbox?url=${encodeURIComponent(data.url)}`);
}
close();
```

Full contract: [React Native Extensions → Runtime contract](./react-native-extensions.md#runtime-contract).

---

## Troubleshooting

### Extension does not appear in the share sheet

1. Run `npx expo prebuild` again
2. Confirm the target exists in the Xcode project
3. Clean build folder (⇧⌘K) and reinstall the app

### `Target 'X' not found`

Ensure `createTarget('X')` matches the config `name` field exactly (case-sensitive).

### Bundle / Metro errors for the extension entry

Ensure `metro.config.js` wraps with `withTargetsMetro` and `entry` points at a real file relative to the project root.

### App Group / data issues

Match App Group IDs in `app.json`, `expo-target.config.json`, and any native suite name.

### Upgrading from expo-targets &lt; 0.2.8 (sealed path)

Pre-0.2.8 docs referred to generated hosts under paths that are no longer the sealed zone. **CNG output is now** `ios/<App>/ExpoTargetsGenerated/<Product>/` (gitignored). Move any hand-edits you made under the old generated tree into `targets/<name>/ios/`, then `npx expo prebuild` again. Never commit or edit `ExpoTargetsGenerated/`.

---

## Next Steps

- **[React Native Extensions](./react-native-extensions.md)** — Runtime contract, Metro, messages
- **[Configuration](./configuration.md)** — All options and extension types
- **[API Reference](./api.md)** — JavaScript/TypeScript API
- **[Widgets](./widgets.md)** — WidgetKit ownership vs `expo-widgets` (no dual-generate)
- **[Examples](../examples/)** — Thin hosts (start with [`examples/share`](../examples/share))

## Workflows: Managed vs Bare

### Expo Managed (Recommended)

```bash
npx expo prebuild
npx expo run:ios
```

### Bare React Native

> **`npx expo-targets sync` is unimplemented** (unpublished stub). Prefer managed Expo + `npx expo prebuild` until a real sync ships. Tracking: [#67](https://github.com/csark0812/expo-targets/issues/67).
