# API Reference

**Source of truth for** the JavaScript/TypeScript runtime API.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-05 -->

> Widget targets: first-class native WidgetKit + Live Activities — see [widgets.md](./widgets.md).

## createTarget

Creates a target instance for communicating with your extension.

Target names are plain strings matching `expo-target.config.json` `"name"`. After `prebuild` / `npx expo-targets generate`, TypeScript narrows those literals via ambient types under `.expo/types/` (Expo Router–style — no import from `.expo/`):

```typescript
import { createTarget } from "expo-targets";

const share = createTarget("MyShare"); // typed as TargetName when generated
```

```typescript
import { createTarget } from "expo-targets";

// For widgets and non-RN extensions
const widget = createTarget("MyWidget");

// For React Native extensions (share, action, clip, messages)
// Pass the component as second argument - handles AppRegistry automatically
import ShareExtension from "./ShareExtension";
export const share = createTarget("ShareExt", ShareExtension);
```

**Parameters:**

| Parameter   | Type                  | Description                                                                                |
| ----------- | --------------------- | ------------------------------------------------------------------------------------------ |
| `name`      | `string` (`TargetName` when generated) | Must match the `name` field in your `expo-target.config.json` **exactly** (case-sensitive) |
| `component` | `React.ComponentType` | _(Optional)_ For RN extensions only. Automatically calls `AppRegistry.registerComponent()` |

When you pass a component as the second argument, `createTarget` handles registration for you — no need to call `AppRegistry.registerComponent()` manually. No type argument is required.

### Error Handling

`createTarget` throws if the target isn't found or misconfigured:

```typescript
try {
  const widget = createTarget("MyWidget");
} catch (error) {
  // Possible errors:
  // - 'Target "MyWidget" not found. Ensure it's defined in app.json under "extra.targets"'
  // - 'App Group not configured for target "MyWidget". Add "appGroup" to your target config.'
}
```

**Console warnings** (non-fatal):

```
[expo-targets] Target "MyWidget" not found
[expo-targets] Available targets: HelloWidget, ShareExt
```

---

## Target Methods

All targets share `name`, `type`, `appGroup`, `storage`, `config`, plus:

### Batch storage (`setData` / `getData`)

```typescript
// Set multiple values at once (preferred for host ↔ extension / widget data)
widget.setData({
  message: "Hello",
  count: 42,
  timestamp: Date.now(),
});

const data = widget.getData<{
  message: string;
  count: number;
  timestamp: number;
}>();
```

### Keyed storage (`target.storage`)

Per-key helpers live on **`target.storage`** (`AppGroupStorage`), not on the target itself:

```typescript
widget.storage.set("message", "Hello");
widget.storage.set("count", 42);

const message = widget.storage.get<string>("message");
const count = widget.storage.get<number>("count");

widget.storage.remove("message");
widget.storage.clear();
```

### Refresh

```typescript
widget.refresh(); // Tell iOS/Android to reload this widget / surface
```

**Important:** Call `refresh()` after updating data when you need an immediate widget reload.

```typescript
widget.setData({ message: "Updated!" }, { refresh: true });
// or batch writes then: widget.refresh();
```

---

## Utility Functions

```typescript
import { refreshAllTargets, clearSharedData } from "expo-targets";

// Refresh all widgets and controls (useful after bulk updates)
refreshAllTargets();

// Clear all data for a specific App Group
clearSharedData("group.com.yourapp");
```

---

## Extension Functions

For share, action, and clip extensions running React Native:

```typescript
import { close, openHostApp, getSharedData } from "expo-targets";

// Get content shared to the extension
const data = getSharedData();

// Open the main app with a deep link
openHostApp("/shared-content");

// Close the extension and return to the previous app
close();
```

### getSharedData()

Returns the content shared to your extension. Returns `null` if called outside an extension context.

```typescript
const data = getSharedData();
// Returns SharedData | null:
// {
//   text?: string,           // Plain text content
//   url?: string,            // URL string
//   images?: string[],       // Array of image file paths
//   webpageUrl?: string,     // Web page URL (from Safari)
//   webpageTitle?: string,   // Web page title
//   preprocessedData?: any,  // Data from preprocessing.js (if configured)
// }
```

**Example usage:**

```typescript
const data = getSharedData();

if (data?.url) {
  console.log("Shared URL:", data.url);
}

if (data?.images?.length) {
  console.log("Shared images:", data.images);
  // images are file:// paths you can use with Image component
}

if (data?.text) {
  console.log("Shared text:", data.text);
}
```

### openHostApp(path)

Opens your main app with a deep link. **No additional configuration required** — expo-targets automatically registers your app's bundle identifier as a URL scheme.

```typescript
// Opens: com.yourcompany.yourapp://shared
openHostApp("/shared");

// Opens: com.yourcompany.yourapp://item/123
openHostApp("/item/123");

// Opens app at root (no path)
openHostApp();
```

**Handling deep links in your main app:**

```typescript
// App.tsx
import { Linking } from 'react-native';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Handle app opened from extension (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle while app is already running (warm start)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  const handleDeepLink = (url: string) => {
    // url = "com.yourcompany.yourapp://shared"
    const path = url.split('://')[1]; // "shared"
    // Navigate to the appropriate screen based on path
  };

  return <>{/* ... */}</>;
}
```

> **Using React Navigation?** Use its [deep linking configuration](https://reactnavigation.org/docs/deep-linking/) instead of manual Linking handling.

### close()

Closes the extension and returns to the app that invoked it.

```typescript
// After saving shared content, close the extension
widget.setData({ lastShared: data.url });
close();
```

**Note:** For Messages extensions, use `requestPresentationStyle('compact')` instead of `close()`.

### SharedData Type

```typescript
interface SharedData {
  text?: string; // Plain text content
  url?: string; // URL string (may include query params)
  images?: string[]; // Array of local file:// paths to images
  webpageUrl?: string; // Web page URL (from Safari share)
  webpageTitle?: string; // Web page title
  preprocessedData?: any; // Data from preprocessing.js (webpage type only)
}
```

---

## Messages Extension API

For iMessage apps (`type: "messages"`):

```typescript
import { createTarget } from "expo-targets";
import MessagesApp from "./MessagesApp";

const messages = createTarget("MyMessagesApp", MessagesApp);
```

### Presentation

```typescript
// Get current presentation style
const style = messages.getPresentationStyle(); // 'compact' | 'expanded' | null

// Request to expand or collapse the extension
messages.requestPresentationStyle("expanded");
messages.requestPresentationStyle("compact"); // Use instead of close()
```

### Sending Messages

```typescript
// Send a message to the conversation
messages.sendMessage({
  caption: "Check this out!",
  subcaption: "Sent from MyApp",
  imageUrl: "https://example.com/image.png",
});

// Interactive messages with session tracking
const sessionId = messages.createSession();
if (sessionId) {
  messages.sendUpdate(
    {
      caption: "Game Score: 10-5",
      subcaption: "Tap to play",
    },
    sessionId,
  );
}

// Insert a small UTF-8 file attachment into the conversation
await messages.insertAttachment({
  filename: "note.txt",
  contents: "Hello from expo-targets",
});
```

### Conversation Info

```typescript
const info = messages.getConversationInfo();
// Returns: {
//   conversationId: string,
//   participantCount: number,
//   hasSelectedMessage: boolean
// } | null
```

### Events

```typescript
// Listen for presentation style changes
const subscription = messages.addEventListener(
  "onPresentationStyleChange",
  (style) => {
    console.log("Style changed to:", style); // 'compact' | 'expanded'
  },
);

// Later: cleanup
subscription.remove();
```

### Full Messages API Reference

```typescript
interface MessagesExtensionTarget {
  // Inherited from BaseTarget
  name: string;
  type: "messages";
  appGroup: string;
  storage: AppGroupStorage;
  config: TargetConfig;
  setData(data: Record<string, any>, options?: { refresh?: boolean }): void;
  getData<T>(): T;
  refresh(): void;

  // Extension methods (no close() for messages)
  openHostApp(path?: string): void;
  getSharedData(): SharedData | null;

  // Messages-specific
  getPresentationStyle(): "compact" | "expanded" | null;
  requestPresentationStyle(style: "compact" | "expanded"): void;
  sendMessage(layout: MessageLayout): void;
  sendUpdate(layout: MessageLayout, sessionId: string): void;
  createSession(): string | null;
  insertAttachment(payload?: {
    filename?: string;
    contents?: string;
  }): Promise<boolean>;
  getConversationInfo(): ConversationInfo | null;
  addEventListener(
    eventName: "onPresentationStyleChange",
    listener: (style: "compact" | "expanded") => void,
  ): { remove: () => void };
}

interface MessageLayout {
  caption: string;
  subcaption?: string;
  imageUrl?: string;
}

interface ConversationInfo {
  conversationId: string;
  participantCount: number;
  hasSelectedMessage: boolean;
}
```

---

## AppGroupStorage Class

Low-level storage access for advanced use cases:

```typescript
import { AppGroupStorage } from "expo-targets";

const storage = new AppGroupStorage("group.com.yourapp");

// Individual key operations
storage.set("key", "value");
storage.get<string>("key");
storage.remove("key");
storage.clear();

// Batch operations
storage.setData({ key1: "value1", key2: "value2" });
storage.getData<{ key1: string; key2: string }>();

// List all keys
const keys = storage.getKeys();

// Trigger refresh for a specific widget
storage.refresh("WidgetName");
```

**When to use AppGroupStorage directly:**

- Multiple targets sharing the same App Group
- Custom storage logic beyond what `createTarget` provides
- Accessing data from a target without its full config

---

## FileProviderDomain

Register / unregister an `NSFileProviderDomain` using identity from `ios.fileProviderDomain` in the file-provider target config (strict CNG — JS may pass `targetName` or assert values; mismatch throws). Zero-arg when exactly one file-provider target exists.

```typescript
import { FileProviderDomain } from "expo-targets";

await FileProviderDomain.register();
await FileProviderDomain.register({ targetName: "MyFiles" });
await FileProviderDomain.unregister({ targetName: "MyFiles" });
```

Config:

```json
{
  "type": "file-provider",
  "ios": {
    "fileProviderDomain": {
      "identifier": "com.example.app.files",
      "displayName": "My Files"
    }
  }
}
```

---

## ContentBlocker

Reload Safari content-blocker rules for the plugin-derived bundle id. Zero-arg when uniquely one content-blocker target.

```typescript
import { ContentBlocker } from "expo-targets";

await ContentBlocker.reload();
await ContentBlocker.reload({ targetName: "MyBlocker" });
```

---

## LiveActivity

Start / update / end Live Activities. `attributesName` must match `liveActivity.attributesName` on a widget target — unknown names throw with the configured list. Prefer `LiveActivity.create(name)` (widgets-like factory). Also exported as `createLiveActivity(name)`.

- **iOS:** ActivityKit (16.2+). Attributes + host bridge are CNG into `ios/*/ExpoTargetsGenerated/` (gitignored). Activity UI stays under `targets/<widget>/ios/`.
- **Android:** Ongoing `NotificationCompat` helper (same JS surface). No Dynamic Island / StandBy / ActivityKit push-to-start.

```typescript
import { LiveActivity } from "expo-targets";

if (await LiveActivity.areActivitiesEnabled()) {
  const order = LiveActivity.create("OrderAttributes");
  const id = await order.start({
    attributes: { orderId: "12" },
    contentState: { status: "preparing", progress: 0.1 },
  });
  await order.update(id, { status: "ready", progress: 1 });
  await LiveActivity.end(id);
  await LiveActivity.endAll();
}
```

See [widgets.md](./widgets.md).

## AndroidNotification

Android-only local path for `notification-service` / `notification-content` (Wave 2). Not a substitute for iOS NSE/NCE process isolation. FCM remote push is leftover when credentials are unavailable.

```typescript
import { AndroidNotification } from "expo-targets";

// notification-service: mutate title + post
const title = await AndroidNotification.processAndPresent({
  title: "Hello",
  body: "local",
  targetName: "NotificationService",
});

// notification-content: RemoteViews / DecoratedCustomViewStyle
await AndroidNotification.presentContent({
  title: "Rich",
  body: "custom view",
  targetName: "NotificationContent",
});

await AndroidNotification.getLastProcessedTitle("group.com.example.app");
```

---

## Safari extension runtime

Safari targets with an `entry` return `SafariExtensionTarget` (`closePopup`, `openTab`, `copyToClipboard`). Packaging (prebuild shell + Xcode export phase / `npx expo-targets export-safari` → sealed `popup.js`) is in [configuration.md](./configuration.md#example-safari-extension).

```typescript
import {
  createTarget,
  useBrowserTab,
  useBrowserStorage,
  useLocalBrowserStorage,
  useSendToContentScript,
  useSendToNative,
  useMessageListener,
  openTab,
  closePopup,
  copyToClipboard,
  getBrowserAPI,
} from "expo-targets";

const safari = createTarget("MySafari");
await safari.openTab("https://example.com");
safari.closePopup();
```

Hooks for content/popup scripts: `useBrowserTab`, `useBrowserStorage`, `useLocalBrowserStorage`, `useSendToContentScript`, `useSendToNative`, `useMessageListener`, plus `getBrowserAPI` for imperative access.

---

## getExtensionNativeModule

Low-level access to the native extension module (share/action/clip/messages). Prefer `createTarget` / `getSharedData` / `close` helpers for app code.

```typescript
import { getExtensionNativeModule } from "expo-targets";

const mod = getExtensionNativeModule();
```

---

## ExtensionUpdates

Host-only bridge from [expo-updates](https://docs.expo.dev/versions/latest/sdk/updates/) to App Group sideload. The appex never runs Updates — see [Extension bundle sideload](./react-native-extensions.md#extension-bundle-sideload-with-expo-updates).

**Default:** importing `expo-targets` on the **host** auto-calls `ExtensionUpdates.enable()` (no-op in appexes / when ExpoUpdates or the host install module is missing).

```typescript
import { ExtensionUpdates } from "expo-targets";
// Optional explicit call / options:
ExtensionUpdates.enable();
```

`enable()`:

- Discovers RN-native targets + App Group from `expo.extra.targets`
- Resolves bundles via Metro alias `expo-targets/extension-bundle-assets` → `assets/expo-targets/extensionBundleModules.js`
- Syncs App Group from the **currently running** update on launch (`syncOnStart`, default `true`)
- Returns the Updates-shaped API (`checkForUpdateAsync`, `fetchUpdateAsync`, `reloadAsync`, `syncFromCurrentUpdate`)

**Publish** — export extension Hermes bundles **before** the host update so assets land in the same publish:

```bash
npx expo-targets export-extension-bundles
eas update --branch production
```

Require a **string** `expo.runtimeVersion` (baked into the appex at prebuild; also written into sideload manifests). Policy objects are not resolved here — App Group load stays disabled until a plain string is set.

### Low-level

```typescript
import { ExtensionUpdates } from "expo-targets";

const api = ExtensionUpdates.create({
  appGroup: "group.com.yourcompany.myapp",
  targets: [{ targetName: "ShareExt", type: "share" }],
  assetModules: require("../assets/expo-targets/extensionBundleModules"),
});
await api.fetchUpdateAsync(); // Updates.fetch + App Group install when isNew
await api.syncFromCurrentUpdate(); // install from the already-running update
```

---

## CLI Commands

### expo-targets add

Scaffold a new target (interactive when args are omitted):

```bash
npx expo-targets add
npx expo-targets add share my-share
npx expo-targets add --no-wire   # scaffold only
```

**Prompts (interactive):**

1. **Type:** Widget (optional Live Activity), App Intent, Share, and other extension types
2. **Name:** Target name in kebab-case (e.g., `my-widget`)
3. **Platforms:** iOS (Android widgets bridge-grade)
4. **Use React Native?** (share/action/clip/messages/notification-content/safari when applicable)
5. **Live Activity?** (widget only) — Emits `liveActivity` config + one-shot UI bootstrap

Wires the host by default (plugin, App Groups, Metro). Dynamic `app.config.ts`/`js` gets a snippet warning instead of a hard fail — finish with `npx expo-targets doctor`. After scaffold, `generate` writes `.expo/types/expo-targets.d.ts`.

**What it creates:**

```
targets/{name}/
├── expo-target.config.json  # Configuration (incl. appGroup when resolved)
├── index.tsx                # RN: createTarget<'type'>('Name', Component)
└── ios/
    └── {Main}.swift         # Template code for the extension type
```

Native-only targets get `index.ts` with `createTarget('Name')` instead of `index.tsx`.

### expo-targets sync (bare React Native)

Applies iOS config-plugin mods to an existing `ios/` tree without a full prebuild wipe.

```bash
npx expo-targets sync
npx expo-targets sync --dry-run
npx expo-targets sync --clean   # opt-in orphan cleanup (sealed dirs + Podfile)
```

**Managed Expo / prebuild path (recommended for new apps):**

```bash
npx expo prebuild --platform ios
```

### expo-targets export-extension-bundles

Hermes-export each RN-native target `entry` for App Group OTA. Writes `assets/expo-targets/` (bundles + `extensionBundleModules.js`) and optionally a publish layout under `dist/`. Run **before** `eas update`.

```bash
npx expo-targets export-extension-bundles
```

Fails closed if `expo.runtimeVersion` is not a non-empty string. Details: [Extension bundle sideload](./react-native-extensions.md#extension-bundle-sideload-with-expo-updates).

---

## TypeScript Types

All types are exported from the main package:

```typescript
import type {
  Target,
  BaseTarget,
  ExtensionTarget,
  MessagesExtensionTarget,
  SafariExtensionTarget,
  NonExtensionTarget,
  SharedData,
  ExtensionType,
  TargetConfig,
  PresentationStyle,
  MessageLayout,
  ConversationInfo,
} from "expo-targets";
```

### ExtensionType

The full `ExtensionType` union and per-type maturity live in [configuration.md](./configuration.md) (single SSOT). Do not maintain a second hand-written type list here.

### Target Types

```typescript
interface BaseTarget {
  name: string;
  type: ExtensionType;
  appGroup: string;
  storage: AppGroupStorage;
  config: TargetConfig;
  setData(data: Record<string, any>, options?: { refresh?: boolean }): void;
  getData<T extends Record<string, any>>(): T;
  refresh(): void;
}

interface ExtensionTarget extends BaseTarget {
  close(): void;
  openHostApp(path?: string): void;
  getSharedData(): SharedData | null;
}

interface SafariExtensionTarget extends BaseTarget {
  type: "safari";
  closePopup(): void;
  openTab(url: string): Promise<void>;
  copyToClipboard(text: string): Promise<boolean>;
}

interface NonExtensionTarget extends BaseTarget {
  // Widgets, stickers, etc. — no close/openHostApp
}
```

---

## Platform Support

### Runtime API

| API                       | iOS          | Android    |
| ------------------------- | ------------ | ---------- |
| `createTarget()`          | ✅ iOS 13+   | ✅ API 26+ |
| `setData` / `getData`     | ✅ iOS 13+   | ✅ API 26+ |
| `storage.set` / `.get`    | ✅ iOS 13+   | ✅ API 26+ |
| `refresh()`               | ✅ iOS 14+   | ✅ API 26+ |
| `refreshAllTargets()`     | ✅ iOS 14+   | ✅ API 26+ |
| `clearSharedData()`       | ✅ iOS 13+   | ✅ API 26+ |
| `FileProviderDomain.*`    | ✅ iOS 11+   | —          |
| `ContentBlocker.reload`   | ✅ iOS 11+   | —          |
| `LiveActivity.*`          | ✅ iOS 16.2+ | ✅ Ongoing-notif helper (partial) |
| `AndroidNotification.*`   | —            | ✅ W2 local NSE/NCE path |
| `close()`                 | ✅ iOS 13+   | ✅ Wave 0+ (target Activity) |
| `openHostApp()`           | ✅ iOS 13+   | ✅ Wave 0+ |
| `getSharedData()`         | ✅ iOS 13+   | ✅ Wave 0+ (Intent extras) |

### Extension Types by Platform

**Canonical table:** [configuration.md](./configuration.md) (all ~47 types + maturity). Showcase types below:

| Type       | iOS        | Android                        |
| ---------- | ---------- | ------------------------------ |
| `widget`   | ✅ iOS 14+ | ✅ API 26+ (Glance: API 33+)   |
| `clip`     | ✅ iOS 14+ | —                              |
| `stickers` | ✅ iOS 10+ | —                              |
| `messages` | ✅ iOS 10+ | —                              |
| `share`    | ✅ iOS 8+  | ✅ W1 dedicated Activity (native; RN provisional) |
| `action`   | ✅ iOS 8+  | ✅ W1 `PROCESS_TEXT` Activity (native; RN provisional) |
| `notification-service` | ✅ iOS 10+ | ✅ W2 partial (local NotificationCompat; FCM leftover) |
| `notification-content` | ✅ iOS 10+ | ✅ W2 partial (RemoteViews / A12 clamp) |
| `file-provider` | ✅ iOS 11+ | ✅ W3a DocumentsProvider |
| `keyboard` | ✅ iOS 8+ | ✅ W3b IME (Settings leftover) |
| `network-packet-tunnel` | ✅ NE | ✅ W3c VpnService (consent leftover) |

> Only **stickers** is asset-only (`requiresCode: false`). Do not add orphan ExtensionTypes without example + Devicewright row ([deprecations.md](./deprecations.md)).

### Android Notes

- **Widgets** use SharedPreferences for data storage (equivalent to iOS App Groups); first-class Glance/Compose deepen
- **Glance widgets** require Android 13+ (API 33) for full Compose support
- **RemoteViews widgets** work on Android 8+ (API 26) with XML layouts
- **Widget refresh** triggers via BroadcastReceiver
- **Extension JS APIs** (`getSharedData` / `openHostApp` / `close`) need a target Activity (`ExpoTargetsHarnessActivity` or Share/Action Activities)
- **Share/action** register dedicated Activities (not MainActivity) with MIME filters from `android.activationRules` or `ios.activationRules`
- **Notifications** register a host-process Service + channels; use `AndroidNotification.*` for the local path. No sealed NSE process — only notifications you route. FCM push is leftover without credentials.
- **LiveActivity on Android** posts ongoing notifications (partial vs ActivityKit)
- **System services (W3):** DocumentsProvider, AutofillService, InputMethodService, CallScreeningService, PrintService, VpnService (fail-closed). Settings/Play leftovers documented in [limits.md](./limits.md)
- **getTargetsConfig** reads `assets/expo_targets_config.json` written at prebuild
- **RN on Android share:** provisional — native Activity is the default path until Expo RN Activity TTI is measured (spike `android-rn-host-2026-08-05.md`)
- Full type matrix: [configuration.md](./configuration.md)

---

## Common Errors

| Error Message              | Cause                              | Solution                                                     |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| `Target "X" not found`     | Target name doesn't match config   | Check `createTarget('X')` matches `"name"` in config exactly |
| `App Group not configured` | Missing `appGroup` in config       | Add `appGroup` to `expo-target.config.json` or `app.json`    |
| `Unknown Live Activity attributesName` | Name not in widget `liveActivity` | Use a configured `attributesName` / `LiveActivity.create` |
| `fileProviderDomain` missing | FP target lacks domain config      | Add `ios.fileProviderDomain` to the file-provider config     |
| `No targets config found`  | Running in wrong context           | Ensure you're in the app/extension, not a unit test          |
| `close is not a function`  | Calling `close()` on non-extension | Only share/action/clip targets have `close()`                |
