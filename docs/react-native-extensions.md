# React Native in Extensions

**Source of truth for** React Native extensions (runtime contract, Metro, type support).

<!-- doc-meta: owner=eng | last-reviewed=2026-08-31 -->

Build share extensions, action extensions, App Clips, iMessage apps, rich notification UI, and Safari popups with React Native instead of native Swift or Kotlin.

> **Status:** Backbone v1 covers the cross-type [runtime contract](#runtime-contract) and hardened `withTargets` Metro packaging. Prefer these patterns. Type-specific polish continues on top. (`withTargetsMetro` is a deprecated alias.)

## Supported Types

| Type                   | React Native Support | Notes                                                              |
| ---------------------- | -------------------- | ------------------------------------------------------------------ |
| `share`                | ✅ Full support      | Custom UI for sharing                                              |
| `action`               | ✅ Full support      | Process content in place                                           |
| `clip`                 | ✅ Full support      | Lightweight app preview                                            |
| `messages`             | ✅ Full support      | iMessage app with RN UI                                            |
| `notification-content` | ✅ Supported         | Rich notification UI (RN host)                                     |
| `safari`               | ✅ Supported         | Popup via RN Web + `expo export` packaging — [configuration](./configuration.md#example-safari-extension) |
| `widget`               | Native or **expo-ui** (sandbox) | `entry` ⇒ expo-ui layout; no full RN |
| `stickers`             | ❌ Native only       | Static image assets                                                |

## UI modes (`ui` / `entry`)

| Mode | When | What runs |
| --- | --- | --- |
| `native` | No `entry` | Swift / Kotlin deepen |
| `react-native` | Share-class + `entry` (default) | Full RN Views in the appex |
| `expo-ui` | Share-class + `ui: 'expo-ui'` + `entry`; **or** `widget`/`watch-widget` + `entry` (inferred) | `@expo/ui` Host-in-RN (share-class) or layout sandbox (widgets) |

```json
{
  "type": "share",
  "name": "Share",
  "entry": "./targets/share/index.tsx",
  "ui": "expo-ui"
}
```

```tsx
import { Host, Text, VStack } from '@expo/ui/swift-ui';
// Host tree inside createTarget('Share', ShareExtension) — same registration as RN.
```

Doctor errors on illegal combos (for example `ui: 'react-native'` on `widget`). See `resolveUiMode` in the plugin domain.

Sealed RN stubs and build artifacts land under `ios/<App>/ExpoTargetsGenerated/<Product>/` (gitignored). Deepen under `targets/*/ios/`. Never edit `ExpoTargetsGenerated/`.

---

## Runtime contract

Stable across **share**, **action**, **clip**, and **messages**. Messages adds APIs on top.

### Bootstrap

1. Declare `entry` in `expo-target.config` (path relative to project root).
2. Wrap Metro with `withTargets` so the extension host can resolve that entry.
3. Call `createTarget(name, Component)` in the entry file. The `name` must match config `name` exactly. Share-class registers with `AppRegistry`. expo-ui widgets register the `'widget'` layout through `expo-widgets` (not AppRegistry). For Live Activity slots on the same widget target, also call `createLiveActivityLayout(name, slots)`.
4. Rebuild native (`npx expo prebuild`, or `npx expo-targets sync` on bare RN). The extension target must embed expo-targets and load the RN host.

For expo-ui widgets, prefer `setData(props, { refresh: true })` (snapshot) or `setTimeline([{ date, props }, …])`, `getTimeline()`, or `refresh()`. See [widgets.md](./widgets.md).

### Lifecycle (share / action / clip)

| API                  | Role                                   |
| -------------------- | -------------------------------------- |
| `getSharedData()`    | Read content passed into the extension |
| `openHostApp(path?)` | Open the containing app                |
| `close()`            | Dismiss the extension UI               |

These require the **ExpoTargetsExtension** native module inside the extension process. Calls from the main app or without a native build throw an actionable error.

### Failure modes

| Symptom                               | Likely cause                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `Target "X" not found`                | Config `name` / `createTarget` mismatch, or targets not in `extra.targets` / Info.plist |
| `App Group not configured`            | Missing `appGroup` on the target                                                        |
| `requires an "entry" field`           | Passed a Component without `entry` in config                                            |
| `ExpoTargetsExtension is unavailable` | Not running in the extension, or native module not linked — re-prebuild                 |
| Metro cannot resolve entry            | Missing `withTargets`, or `entry` path wrong                                            |

### Messages

Same bootstrap + packaging. Additive APIs: `sendMessage`, `sendUpdate`, `requestPresentationStyle`, conversation helpers — see [API](./api.md).

---

## Quick Setup

### 1. Create the Target

```bash
npx expo-targets add
# Choose: Share Extension → share-ext → iOS → Yes (Use React Native)
```

Or manually configure `expo-target.config.json`:

```json
{
  "type": "share",
  "name": "ShareExt",
  "platforms": ["ios"],
  "appGroup": "group.com.yourcompany.yourapp",
  "entry": "./targets/share-ext/index.tsx"
}
```

Key fields:

- `entry`: Path to your React Native entry file **(relative to project root)**
- `excludedPackages`: Optional force-strip list. Unused autolinked host packages are already stripped for RN `entry` targets. `expo-updates` and `expo-dev-client` are always merged. Nested `use_expo_modules!(exclude:)` alone does **not** work.

### 2. Create the Entry Point

```typescript
// targets/share-ext/index.tsx
import { createTarget } from "expo-targets";
import ShareExtension from "./src/ShareExtension";

// Pass the component as the second argument - handles registration automatically
export const shareTarget = createTarget("ShareExt", ShareExtension);
```

The second parameter to `createTarget` calls `AppRegistry.registerComponent()` for you. The name must match the `name` field in your config exactly.

### 3. Build Your Component

```typescript
// targets/share-ext/ShareExtension.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { getSharedData, close, openHostApp, SharedData } from 'expo-targets';

export default function ShareExtension() {
  const [data, setData] = useState<SharedData | null>(null);

  useEffect(() => {
    // Get the content that was shared to this extension
    setData(getSharedData());
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Share to My App</Text>

      {data?.url && <Text style={styles.info}>URL: {data.url}</Text>}
      {data?.text && <Text style={styles.info}>Text: {data.text}</Text>}

      <Button title="Open in App" onPress={() => openHostApp('/shared')} />
      <Button title="Cancel" onPress={close} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    fontSize: 16,
    marginBottom: 10,
  },
});
```

### 4. Configure Metro

**Required for all React Native extensions.** Metro must bundle your extension entry point separately from the main app.

```javascript
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withTargets } = require("expo-targets/metro");

module.exports = withTargets(getDefaultConfig(__dirname));
```

The Metro wrapper:

- Discovers targets with an `entry` field in their config
- Validates that each `entry` file exists (warns when missing)
- Maps Metro `bundleRoot` (entry path without extension) to the absolute entry file. This must match the native host `jsBundleURL(forBundleRoot:)`
- Chains any existing `resolveRequest` so other Metro plugins keep working

> **Note:** Pure Swift or SwiftUI extensions (like widgets) do NOT need Metro configuration.

### 5. Build and Run

```bash
npx expo-targets doctor
npx expo prebuild
npx expo run:ios
```

For testing extensions in Release mode (recommended for performance testing):

```bash
npx expo run:ios --configuration Release
```

---

## Naming Conventions

**All names must match exactly.** This is the most common source of bugs:

| Location                  | Value          | Example      |
| ------------------------- | -------------- | ------------ |
| Config `name` field       | PascalCase     | `"ShareExt"` |
| `createTarget()` argument | Same as config | `'ShareExt'` |

**If these do not match**, the extension crashes on launch with no useful error message.

```typescript
// expo-target.config.json
{ "name": "ShareExt" }

// index.tsx - MUST use exact same name
createTarget('ShareExt', ShareExtension);  // ✅ Correct
createTarget('shareExt', ShareExtension);  // ❌ Wrong case - will crash
createTarget('ShareExtension', ShareExtension);  // ❌ Wrong name - will crash
```

---

## Available APIs

```typescript
import {
  getSharedData, // Get content shared to extension
  close, // Close the extension
  openHostApp, // Open main app with deep link
  createTarget, // Access shared storage
} from "expo-targets";
```

### getSharedData()

Returns the content shared to your extension:

```typescript
const data = getSharedData();
// {
//   text?: string,      // Plain text
//   url?: string,       // URL
//   images?: string[],  // Array of file:// paths
//   webpageUrl?: string,
//   webpageTitle?: string,
//   preprocessedData?: any,  // From preprocessing.js
// }
```

### Saving Data for Main App

Save data in the extension for your main app to read later:

```typescript
import { createTarget, close } from "expo-targets";

const shareTarget = createTarget("ShareExt");

function handleSave() {
  const data = getSharedData();

  // Save to shared storage
  shareTarget.setData({
    lastShared: data?.url,
    timestamp: Date.now(),
  });

  // Close the extension
  close();
}
```

Your main app can read this data:

```typescript
// In your main app
import { createTarget } from "expo-targets";

const shareTarget = createTarget("ShareExt");
const data = shareTarget.getData();
console.log("Last shared:", data?.lastShared);
```

### Opening the Main App

Use `openHostApp()` to open your main app with a deep link:

```typescript
import { openHostApp } from "expo-targets";

function handleOpenInApp() {
  // Opens: com.yourcompany.yourapp://shared/123
  openHostApp("/shared/123");
  // Extension closes automatically after opening host app
}
```

**No extra setup is required.** expo-targets uses your bundle identifier as the URL scheme automatically.

In your main app, handle the deep link:

```typescript
// App.tsx
import { Linking } from "react-native";
import { useEffect } from "react";

useEffect(() => {
  const handleUrl = ({ url }: { url: string }) => {
    const path = url.split("://")[1]; // "shared/123"
    // Navigate based on path
  };

  // Handle cold start
  Linking.getInitialURL().then((url) => url && handleUrl({ url }));

  // Handle warm start
  const sub = Linking.addEventListener("url", handleUrl);
  return () => sub.remove();
}, []);
```

---

## Memory Limits & Bundle Size

iOS extensions have **strict memory limits**. Exceeding them causes iOS to terminate your extension without warning.

### Memory Limits by Extension Type

| Extension Type     | Typical Limit | Behavior When Exceeded          |
| ------------------ | ------------- | ------------------------------- |
| Share Extension    | ~120MB        | Terminated, user sees error     |
| Action Extension   | ~120MB        | Same as share extensions        |
| Widget             | ~30MB         | Terminated silently             |
| App Clip           | ~150MB        | More lenient, but still limited |
| Messages Extension | ~120MB        | Similar to share extensions     |

**Important:** These are approximate limits. iOS can terminate extensions that use less memory under system pressure. Always test on physical devices.

**Reference:** [Apple's App Extension Programming Guide](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/)

### Excluding Packages

Omit unused host packages from the nested extension's `ExpoModulesProvider` and
from the `Pods-<Target>` linker. Nested `use_expo_modules!(exclude:)` is a no-op
(parent AutolinkingManager). expo-targets strips names from `expo-configure-project.sh`
in a `post_integrate` hook, regenerates the provider, and drops matching `-l` /
`-framework` / module-map flags.

For RN-native targets with `entry`, the plugin inverts the host autolink set:

`strip = autolinked − (core ∪ entry imports ∪ linkedPackages)`

Core keep is React Native, Hermes, Yoga, ExpoModulesCore, and `expo-targets`.
The same strip set is applied to `ExpoModulesProvider` and to `Pods-<Target>`
linker flags (`-l`, `-framework`, module maps). Linker tokens include XCFramework
names from each unused package podspec (`s.dependency "Intercom"` → `-framework Intercom`),
not only the npm or wrapper-pod name. The host can still embed those
frameworks in the app. The plugin does not copy host `OTHER_LDFLAGS`.

**Always stripped (no escape hatch):**

| Package           | Reason                 |
| ----------------- | ---------------------- |
| `expo-updates`    | Crashes appex process  |
| `expo-dev-client` | Host-only dev tooling  |
| `expo-dev-launcher` | Host-only dev tooling |
| `expo-dev-menu`   | Host-only dev tooling  |

`excludedPackages` is force-strip only. Use `linkedPackages` when a native
module must stay and the entry does not import it. Set `ios.nativeLink` to
`"host"` only when you need the old fat host link.

```json
{
  "linkedPackages": ["expo-image"],
  "ios": {
    "nativeLink": "entry"
  }
}
```

`npx expo-targets doctor` reports the unlink count for each RN `entry` target.

### Tips for Smaller Bundles

1. **Keep the invert default** — Import only what the entry needs. Use `linkedPackages` for native-only keep. Run `npx expo-targets doctor`
2. **Avoid heavy UI libraries** — Use basic React Native components
3. **Keep extension logic minimal** — Do heavy processing in your main app
4. **Test on physical devices** — Simulators are more forgiving with memory

### Extension bundle sideload (with expo-updates)

RN extensions **never** link `expo-updates` (auto-excluded. Updates in an appex crashes the process). Extension JS still OTAs through the **host**:

| Process | Role |
| ------- | ---- |
| Host app | Runs `expo-updates`. After an update applies, copies each target’s Hermes `main.jsbundle` from the update into the App Group. |
| Appex (Release) | Does **not** run Updates. Loads App Group sideload when valid; otherwise the Xcode-embedded `main.jsbundle`. |
| Appex (DEBUG) | Metro only — App Group sideload is **not** consulted. |

Layout on disk (App Group container):

```text
{AppGroup}/expo-targets/bundles/{config.name}/
  main.jsbundle
  manifest.json   # runtimeVersion, sha256, byteLength, targetName, type
```

`config.name` is the folder key (e.g. `"Share"`), not the Xcode product name (`UpdatesShareTarget`).

#### Requirements

1. **String `expo.runtimeVersion`** in `app.json` or `app.config` (for example `"1.0.0"`). Prebuild bakes it into the extension RN host. When it is missing or a policy object, App Group load is skipped forever and Release always uses the embedded bundle.
2. **Shared App Group** on host + target (`appGroup` / entitlements).
3. **Host import** of `expo-targets` (auto-enables `ExtensionUpdates`) or an explicit `ExtensionUpdates.enable()`.
4. **Metro** wrapped with `withTargets` so the publish-time asset module resolves when `assets/expo-targets/extensionBundleModules.js` exists. Before that export, the packaged `expo-targets/extension-bundle-assets` stub is an empty map.

#### Publish pipeline

Order matters. Host `eas update` must include the freshly exported extension assets:

```bash
npx expo-targets export-extension-bundles   # Hermes per RN entry → assets/expo-targets/
eas update --branch production              # or --channel …
```

`export-extension-bundles` writes:

- `assets/expo-targets/bundles/{Name}/main.jsbundle` (+ manifest)
- `assets/expo-targets/extensionBundleModules.js` (`require()` map for the host)

The host update then ships those files as normal Metro assets. On device, `Asset.fromModule` resolves the local file; native install copies it into the App Group.

Dogfood walkthrough: [`examples/extension-updates`](../examples/extension-updates/README.md). API details: [ExtensionUpdates](./api.md#extensionupdates).

#### How the appex chooses a bundle

```text
DEBUG:   Metro (packager) → embedded main.jsbundle
Release: App Group sideload (if valid) → embedded main.jsbundle
```

App Group is **valid** only when all of these hold:

- Manifest `runtimeVersion` equals the **baked** `expo.runtimeVersion` from prebuild
- `byteLength` ≤ type cap (**5 MiB** share / action / messages / notification-content; **8 MiB** clip)
- File `sha256` matches the manifest

Invalid or missing sideloads stay on disk for diagnostics; the appex falls back to embedded.

#### What updates vs what does not

| Kind | DEBUG (Metro) | Release embedded | After App Group OTA |
| ---- | ------------- | ---------------- | ------------------- |
| Extension JS / inlined `EXPO_PUBLIC_*` | live | bake at `expo run:ios` | **updates** (sideloaded jsbundle) |
| `require()` images / custom fonts | Metro / Xcode pack | packed next to appex | **gap** — only `main.jsbundle` is installed today |
| System fonts | OK | OK | OK |

Host `eas update` and `export-extension-bundles` each inline `EXPO_PUBLIC_*` separately — changing `.env` between the two can diverge host vs extension tags.

#### Troubleshooting

| Symptom | Likely cause |
| ------- | ------------ |
| Host OTA label updates; share still shows old / embed | Baked `runtimeVersion` empty (re-prebuild with a string `expo.runtimeVersion`), or sync never ran (`installed=0`) |
| Sync error: bundle not found under `Application%20Support` | Fixed in current `expo-targets` (percent-decode asset paths); update the library |
| Sync succeeds but share unchanged | Opening a **DEBUG** build (Metro/embed only), or wrong App Group / target `name` |
| Host updated without `export-extension-bundles` | New host JS, stale extension asset in the update — share keeps previous sideload or embed |

---

## Debugging Extensions

Extensions run in a **separate process** with limited debugging compared to the main app. In **DEBUG** builds, the native host uses `RCTBundleURLProvider` with your target's `bundleRoot` (from `entry` in config). When Metro is running and `withTargets` is configured, the extension can load from the packager. **Fast Refresh and HMR can work for JS-only edits** while the extension is open.

**Release builds** prefer a valid **App Group sideload** (see [Extension bundle sideload](#extension-bundle-sideload-with-expo-updates)), then the embedded `main.jsbundle` baked into the appex at build time. **DEBUG** never reads the App Group. If Metro is unreachable in DEBUG, the host **falls back to the embedded bundle** instead of showing a blank sheet. If neither Metro nor an embedded bundle is available, you get a clear error alert.

**Limitations (unchanged):**

- No Chrome DevTools or JS breakpoints in the extension process
- Historically, extensions did not connect to Metro at all; that was true when the packager was down or `withTargets` was missing
- Native Swift breakpoints in Xcode still work

### Live reload workflow (DEBUG)

1. Configure Metro with `withTargets` (see [Configure Metro](#4-configure-metro)).
2. Start the packager: `npx expo start`
3. Build and run the extension in DEBUG (`npx expo run:ios` or Xcode scheme for the appex).
4. Edit JS or TS in the extension entry or its imports. Save to trigger HMR when Metro is reachable.

If you see the embedded bundle instead of live code, confirm Metro is running, `metro.config.js` uses `withTargets`, and you are on a DEBUG build. Simulator builds default the packager host to `localhost` when no `jsLocation` is set.

### Viewing Console Logs

**Via Xcode (Recommended):**

1. Open your project: `open ios/YourApp.xcworkspace`
2. Select the extension target from the scheme dropdown (top left)
3. Run the extension (⌘R)
4. View logs in the Debug Console (bottom panel)
5. `console.log()` statements from JavaScript appear here

**Via Device Console:**

1. Xcode → **Window** → **Devices and Simulators**
2. Select your device
3. Click **Open Console**
4. Filter by your extension's bundle identifier

**Via Terminal:**

```bash
# Stream logs from simulator
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "YourExtension"'
```

### Debugging Strategies

**JavaScript Errors:**

- Errors appear in Xcode console, not Chrome DevTools
- Without Metro, changes require a native rebuild to pick up a new embedded bundle
- With Metro running in DEBUG, JS-only changes can hot-reload
- Use `console.log()` extensively

**Breakpoint Debugging:**

- Swift breakpoints work normally in Xcode
- JavaScript breakpoints do NOT work (no Chrome DevTools / RN debugger in the extension process)
- Set breakpoints in Swift bridge code if needed

### Common Issues

**Extension crashes on launch:**

```
Symptoms: Extension shows briefly then disappears
Causes:
  - createTarget name doesn't match config name
  - Bundle too large (exceeds memory limit)
  - Missing App Group configuration
Solutions:
  - Check name consistency (see Naming Conventions above)
  - Confirm invert unlinked unused host packages (`npx expo-targets doctor`)
  - Verify App Group IDs match everywhere
```

**Component doesn't render:**

```
Symptoms: Extension shows blank/white screen (or error alert)
Causes:
  - Entry file path wrong in config
  - Metro config wrapper not applied
  - Component not passed to createTarget
  - DEBUG with no Metro and no embedded bundle from last build
Solutions:
  - Verify entry path is relative to project root
  - Check metro.config.js has withTargets wrapper
  - Pass the component as second arg: createTarget('Name', Component)
  - Start Metro (`npx expo start`) for DEBUG live reload, or rebuild so main.jsbundle is embedded
```

**Data sharing fails:**

```
Symptoms: getSharedData() returns null, setData() doesn't persist
Causes:
  - App Group IDs don't match
  - App Group not configured in main app
Solutions:
  - Check all three locations have identical App Group ID:
    • app.json entitlements
    • expo-target.config.json
    • Swift code (if any)
```

**Extension not appearing in share sheet:**

```
Symptoms: Extension missing when sharing from other apps
Causes:
  - activationRules don't match content type
  - Build not complete
Solutions:
  - Check activationRules in config match what you're sharing
  - Clean build folder (⇧⌘K in Xcode)
  - Delete app and reinstall
```

---

## Messages Extension

iMessage apps let users interact with your app directly in Messages.

### Configuration

```json
{
  "type": "messages",
  "name": "MyMessages",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "entry": "./targets/my-messages/index.tsx"
}
```

### Entry Point

```typescript
// targets/my-messages/index.tsx
import { createTarget } from "expo-targets";
import MessagesApp from "./MessagesApp";

// Pass component as second argument - name must match config exactly
export const messagesTarget = createTarget("MyMessages", MessagesApp);
```

### Using Messages APIs

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { createTarget } from 'expo-targets';

const messages = createTarget('MyMessages');

export default function MessagesApp() {
  const [style, setStyle] = useState(messages.getPresentationStyle());

  useEffect(() => {
    const sub = messages.addEventListener('onPresentationStyleChange', (newStyle) => {
      setStyle(newStyle);
    });
    return () => sub.remove();
  }, []);

  const sendSticker = () => {
    messages.sendMessage({
      caption: 'Check this out!',
      subcaption: 'Sent from MyApp',
      imageUrl: 'https://example.com/sticker.png',
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.info}>Current style: {style}</Text>

      <Button
        title="Expand"
        onPress={() => messages.requestPresentationStyle('expanded')}
      />
      <Button title="Send Sticker" onPress={sendSticker} />
      <Button
        title="Collapse"
        onPress={() => messages.requestPresentationStyle('compact')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  info: { fontSize: 16, marginBottom: 20 },
});
```

### Messages API Reference

```typescript
const messages = createTarget('MyMessages');

// Presentation
messages.getPresentationStyle(); // 'compact' | 'expanded' | null
messages.requestPresentationStyle('expanded');
messages.requestPresentationStyle('compact'); // Use instead of close()

// Sending messages
messages.sendMessage({
  caption: string,      // Required: main text
  subcaption?: string,  // Optional: secondary text
  imageUrl?: string,    // Optional: image to display
});

// Interactive sessions
const sessionId = messages.createSession();
messages.sendUpdate({ caption: 'Updated!' }, sessionId);

// Conversation info
messages.getConversationInfo();
// Returns: { conversationId, participantCount, hasSelectedMessage } | null

// Events
const sub = messages.addEventListener('onPresentationStyleChange', (style) => {
  console.log('Style changed:', style);
});
sub.remove(); // Cleanup
```

---

## Examples

See working examples in the repository:

- **[share](../examples/share/)** — React Native share extension
- **[action](../examples/action/)** — React Native action extension
- **[kitchen-sink](../examples/kitchen-sink/)** — Five primary types in one host (messages, not stickers)

```bash
cd examples/share
npm install
npx expo prebuild
npx expo run:ios
```
