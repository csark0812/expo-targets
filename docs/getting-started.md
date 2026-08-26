# Getting Started

**Source of truth for** first-run setup (React Native share extension).

<!-- doc-meta: owner=eng | last-reviewed=2026-08-10 -->

Build a React Native **share extension** with expo-targets.

> **Looking for widgets?** Native WidgetKit and Live Activities are first-class here — see [widgets.md](./widgets.md). Official `expo-widgets` is an alternate React / Expo-UI path. Do not dual-generate.

## Prerequisites

- macOS with Xcode 14+
- **Tested on Expo SDK 57** (development builds; not Expo Go)
- iOS Simulator or device running iOS 14+

> **Device testing**
>
> For physical devices (not Simulator):
>
> - Apple Developer account (free or paid)
> - App Groups capability enabled in your provisioning profile
> - Configure in Xcode: **Signing & Capabilities** → Add **App Groups**
>
> Simulator testing does not need these. Real devices require proper provisioning.

## Step 1: Install

```bash
npm install expo-targets
# or: yarn add expo-targets / bun add expo-targets
```

## Step 2: Create a Share Extension

```bash
npx expo-targets add
# or non-interactive: npx expo-targets add share my-share
```

Choose (interactive):

- **Type:** Share Extension
- **Name:** my-share
- **Use React Native:** Yes

`expo-targets add` scaffolds `targets/my-share/` and wires the host by default: adds `expo-targets` to `package.json`, registers the config plugin, ensures App Group entitlements, and patches `metro.config.js` with `withTargets`. Use `--no-wire` to scaffold only. Dynamic `app.config.ts` / `js` cannot be auto-patched — you get a snippet warning; finish with `npx expo-targets doctor`.

If wiring added `expo-targets` to `package.json`, install dependencies before prebuild.

This creates:

```
targets/my-share/
├── expo-target.config.json
├── index.tsx                 # createTarget + component registration
└── ios/                      # User deepen (committed)
```

After `npx expo prebuild`, sealed artifacts land in `ios/<App>/ExpoTargetsGenerated/<Product>/` (gitignored). Never edit that tree. Deepen under `targets/*/ios/`.

### Manual host setup (advanced)

If you scaffold with `--no-wire` or use a dynamic `app.config.js`, configure the host yourself.

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

> **App Groups are critical**
>
> App Groups share data between your app and extensions. IDs must match exactly or sharing fails.
>
> - Must start with `group.`
> - Convention: `group.{your.bundle.identifier}`
> - Must match in `app.json`, target config, and native code

## Step 3: Example target config

```json
{
  "type": "share",
  "name": "MyShare",
  "displayName": "My Share",
  "platforms": ["ios"],
  "appGroup": "group.com.yourcompany.myapp",
  "entry": "./targets/my-share/index.tsx",
  "ios": {
    "deploymentTarget": "14.0"
  }
}
```

Update the placeholder `appGroup` to match your `app.json`.

For RN `entry` targets, the plugin **always** strips `expo-updates` and `expo-dev-client` from the nested `ExpoModulesProvider` (they crash appex processes). Add `excludedPackages` only for **extra** packages (for example reanimated). `npx expo-targets doctor` warns when heavy host deps look unused by the entry.

Extension JS can still OTA without linking Updates in the appex: the host runs `eas update`, then sideloads Hermes bundles into the App Group. Set a string `expo.runtimeVersion`, run `npx expo-targets export-extension-bundles` before each update, and use a **Release** build to verify the share sheet. Full flow: [Extension bundle sideload](./react-native-extensions.md#extension-bundle-sideload-with-expo-updates).

### Naming conventions

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
const { withTargets } = require("expo-targets/metro");

module.exports = withTargets(getDefaultConfig(__dirname));
```

`withTargets` maps each target `entry` so the extension host can load the right bundle. (`withTargetsMetro` is a deprecated alias.) Details: [React Native Extensions](./react-native-extensions.md).

### Typed target names + Live Activity payloads

After prebuild (or `npx expo-targets generate`), ambient types are written to `.expo/types/expo-targets.d.ts` (gitignored, same layout as Expo Router typed routes). That narrows `createTarget('…')` and `.liveActivity('…')` string literals — **no import from `.expo/`**. When `ios.liveActivity` sets `static` / `contentState`, handle `start` / `update` pick up those field types via module augmentation.

```typescript
import { createTarget, type TargetName } from "expo-targets";

const name: TargetName = "MyShare";
createTarget(name);

// targets/order-widget/index.ts
export const orderWidget = createTarget("OrderWidget");
export const orderLive = orderWidget.liveActivity("OrderAttributes");

await orderLive.start({
  attributes: { orderId: "12" },
  contentState: { status: "preparing", progress: 0.1 },
});
```

Apps that only extend `expo/tsconfig.base` (no `include`) already load `.expo/types/*.d.ts` — `generate` does **not** invent an `include`. If `include` is already set (for example Expo Router), it appends `.expo/types/**/*.ts` when missing.

Regenerate without a full prebuild: `npx expo-targets generate` (also runs with `npx expo-targets doctor --fix`).

## Step 5: Build and run

```bash
npx expo-targets doctor   # validate host wiring
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

Run the doctor first — it catches most wiring mistakes with fix-forward messages:

```bash
npx expo-targets doctor
```

### Extension does not appear in the share sheet

1. Run `npx expo prebuild` again
2. Confirm the target exists in the Xcode project
3. Clean build folder (⇧⌘K) and reinstall the app

### `Target 'X' not found`

Make sure `createTarget('X')` matches the config `name` field exactly (case-sensitive). `npx expo-targets doctor` reports name mismatches.

### Bundle / Metro errors for the extension entry

Make sure `metro.config.js` wraps with `withTargets` (or legacy `withTargetsMetro`) and `entry` points at a real file relative to the project root. `npx expo-targets doctor` validates both.

### App Group / data issues

Match App Group IDs in `app.json`, `expo-target.config.json`, and any native suite name. `npx expo-targets doctor` checks host ↔ target consistency.

### Upgrading from expo-targets &lt; 0.2.8 (sealed path)

Pre-0.2.8 docs referred to generated hosts under paths that are no longer the sealed zone. **CNG output is now** `ios/<App>/ExpoTargetsGenerated/<Product>/` (gitignored). Move any hand-edits you made under the old generated tree into `targets/<name>/ios/`, then run `npx expo prebuild` again. Never commit or edit `ExpoTargetsGenerated/`.

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

For projects that already have a committed `ios/` tree (no full prebuild wipe):

```bash
npx expo-targets sync
cd ios && pod install
npx react-native run-ios
```

Preview changes with `npx expo-targets sync --dry-run`. Orphaned sealed dirs are reported by default; pass `--clean` to remove sealed products and Podfile targets with no matching `targets/*/config`.

**Recommended for new projects:** managed Expo + `npx expo prebuild`.
