# API Reference

**Source of truth for** the JavaScript/TypeScript runtime API.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-04 -->

> Widget targets: first-class native WidgetKit + Live Activities — see [widgets.md](./widgets.md).

## createTarget

Creates a target instance for communicating with your extension.

```typescript
import { createTarget } from "expo-targets";

// For widgets and non-RN extensions
const widget = createTarget("MyWidget");

// For React Native extensions (share, action, clip, messages)
// Pass the component as second argument - handles AppRegistry automatically
import ShareExtension from "./ShareExtension";
export const share = createTarget<"share">("ShareExt", ShareExtension);
```

**Parameters:**

| Parameter   | Type                  | Description                                                                                |
| ----------- | --------------------- | ------------------------------------------------------------------------------------------ |
| `name`      | `string`              | Must match the `name` field in your `expo-target.config.json` **exactly** (case-sensitive) |
| `component` | `React.ComponentType` | _(Optional)_ For RN extensions only. Automatically calls `AppRegistry.registerComponent()` |

When you pass a component as the second argument, `createTarget` handles registration for you — no need to call `AppRegistry.registerComponent()` manually.

### Type Parameter

The `createTarget` function uses TypeScript overloads to provide the correct return type based on your target type. You can optionally specify the type parameter for better type inference:

```typescript
// For messages extensions - returns MessagesExtensionTarget with messaging APIs
const messages = createTarget<"messages">("MyMessages");
messages.sendMessage({ caption: "Hello!" }); // ✅ Type-safe

// For share/action/clip extensions - returns ExtensionTarget with close/openHostApp
const share = createTarget<"share">("MyShare");
share.close(); // ✅ Type-safe

// For widgets and other types - returns NonExtensionTarget
const widget = createTarget<"widget">("MyWidget");
widget.close(); // ❌ TypeScript error: close doesn't exist
```

**When to use the type parameter:**

| Scenario            | Recommendation                                                    |
| ------------------- | ----------------------------------------------------------------- |
| Widgets, stickers   | Not needed — `createTarget('Name')` is sufficient                 |
| Share/action/clip   | Optional but helpful for IDE autocomplete                         |
| Messages extensions | Recommended — unlocks `sendMessage`, `getPresentationStyle`, etc. |

**Without the type parameter**, TypeScript returns a union type and you may need to check properties before using them.

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

All targets (widgets, extensions, etc.) share these core methods:

### Storage

```typescript
// Set a single value
widget.set("message", "Hello");
widget.set("count", 42);
widget.set("user", { name: "John", age: 30 });

// Get a value (returns undefined if not set)
const message = widget.get<string>("message");
const count = widget.get<number>("count");
const user = widget.get<{ name: string }>("user");

// Remove a value
widget.remove("message");

// Clear all data for this target
widget.clear();
```

### Batch Operations

```typescript
// Set multiple values at once (more efficient than multiple set() calls)
widget.setData({
  message: "Hello",
  count: 42,
  timestamp: Date.now(),
});

// Get all data as an object
const data = widget.getData<{
  message: string;
  count: number;
  timestamp: number;
}>();
```

### Refresh

```typescript
// Tell iOS/Android to reload this widget
widget.refresh();
```

**Important:** Always call `refresh()` after updating data to trigger the widget to reload. Without this, the widget may not show new data until the next scheduled refresh.

```typescript
// Correct pattern
widget.setData({ message: "Updated!" });
widget.refresh(); // Widget reloads with new data

// Missing refresh - widget won't update immediately
widget.setData({ message: "Updated!" });
// Widget still shows old data until iOS decides to refresh
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

For iMessage apps (`type: "messages"`), use the type parameter to get full API access:

```typescript
import { createTarget } from "expo-targets";

const messages = createTarget<"messages">("MyMessagesApp");
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
  setData(data: Record<string, any>): void;
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

Start / update / end ActivityKit Live Activities. `attributesName` must match `liveActivity.attributesName` on a widget target — unknown names throw with the configured list. Prefer `LiveActivity.create(name)` (widgets-like factory).

```typescript
import { LiveActivity } from "expo-targets";

const order = LiveActivity.create("OrderAttributes");
const id = await order.start({
  attributes: { orderId: "12" },
  contentState: { status: "preparing", progress: 0.1 },
});
await order.update(id, { status: "ready", progress: 1 });
await LiveActivity.end(id);
await LiveActivity.endAll();
```

Attributes + host bridge are CNG into `ios/*/ExpoTargetsGenerated/` (gitignored). Activity UI stays under `targets/<widget>/ios/`. See [widgets.md](./widgets.md).

---

## CLI Commands

### create-expo-target

Interactive CLI to scaffold a new target:

```bash
npx create-expo-target
```

**Prompts:**

1. **Type:** Widget (optional Live Activity), App Intent, Share, and other extension types
2. **Name:** Target name in kebab-case (e.g., `my-widget`)
3. **Platforms:** iOS (Android widgets bridge-grade)
4. **Use React Native?** (only for share/action/clip) — Whether to use React Native for UI
5. **Live Activity?** (widget only) — Emits `liveActivity` config + one-shot UI bootstrap

App Group is baked from `app.json` entitlements (`com.apple.security.application-groups`) into `expo-target.config.json` and Swift templates when present.

**What it creates:**

```
targets/{name}/
├── expo-target.config.json  # Configuration (incl. appGroup when resolved)
├── index.ts                 # Pre-configured target instance
└── ios/
    └── {Main}.swift         # Template code for the extension type
```

Widget + Live Activity also creates `LiveActivity.swift` + a `WidgetBundle`. App Intent creates an empty `AppIntentExtension.swift` plus a user-owned `*IntentPerform.swift` hook.

If you choose "Use React Native for UI", it also creates:

- `targets/{name}/index.tsx` — React Native entry point with `createTarget()` and component

**Example session:**

```bash
$ npx create-expo-target
🎯 Create Expo Target

? What type of target? Share Extension
? Target name (e.g., my-widget): share-content
? Select platforms: iOS
? Use React Native for UI? Yes

✅ Created target at targets/share-content
✅ Created entry file: targets/share-content/index.tsx
📝 Remember to add Metro config wrapper to metro.config.js

Run `npx expo prebuild` to generate Xcode project
```

### expo-targets sync

Sync targets to an existing Xcode project (bare React Native workflow):

```bash
npx expo-targets sync [options]
```

Use this when you have an existing `ios/` folder that you maintain manually (not generated by `expo prebuild`).

**Options:**

| Flag            | Description                        |
| --------------- | ---------------------------------- |
| `--clean`       | Remove orphaned targets from Xcode |
| `--dry-run`     | Preview changes without writing    |
| `-v, --verbose` | Show detailed output               |

**Example:**

```bash
# Preview what would change
npx expo-targets sync --dry-run

# Sync targets and remove old ones
npx expo-targets sync --clean
cd ios && pod install
```

---

## TypeScript Types

All types are exported from the main package:

```typescript
import type {
  Target,
  BaseTarget,
  ExtensionTarget,
  MessagesExtensionTarget,
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

All supported extension types:

```typescript
type ExtensionType =
  | "widget"
  | "clip"
  | "stickers"
  | "messages"
  | "share"
  | "action"
  | "wallet"
  | "wallet-ui"
  | "safari"
  | "notification-content"
  | "notification-service"
  | "intent"
  | "intent-ui"
  | "app-intent"
  | "spotlight"
  | "bg-download"
  | "quicklook-thumbnail"
  | "location-push"
  | "credentials-provider"
  | "account-auth"
  | "device-activity-monitor"
  | "matter"
  | "watch";
```

### Target Types

```typescript
// Base target with storage methods (all targets have these)
interface BaseTarget {
  name: string;
  type: ExtensionType;
  appGroup: string;
  setData(data: Record<string, any>): void;
  getData<T extends Record<string, any>>(): T;
  refresh(): void;
}

// Extension target (share, action, clip) with close/openHostApp
interface ExtensionTarget extends BaseTarget {
  close(): void;
  openHostApp(path?: string): void;
  getSharedData(): SharedData | null;
}

// Messages extension with messaging APIs
interface MessagesExtensionTarget extends BaseTarget {
  openHostApp(path?: string): void;
  getSharedData(): SharedData | null;
  getPresentationStyle(): PresentationStyle | null;
  requestPresentationStyle(style: PresentationStyle): void;
  sendMessage(layout: MessageLayout): void;
  // ... other messages methods
}

// Non-extension target (widget, stickers, etc.)
interface NonExtensionTarget extends BaseTarget {
  // Only has base methods, no close/openHostApp
}
```

---

## Platform Support

### Runtime API

| API                       | iOS        | Android    |
| ------------------------- | ---------- | ---------- |
| `createTarget()`          | ✅ iOS 13+ | ✅ API 26+ |
| `set/get/setData/getData` | ✅ iOS 13+ | ✅ API 26+ |
| `refresh()`               | ✅ iOS 14+ | ✅ API 26+ |
| `refreshAllTargets()`     | ✅ iOS 14+ | ✅ API 26+ |
| `clearSharedData()`       | ✅ iOS 13+ | ✅ API 26+ |
| `FileProviderDomain.*`    | ✅ iOS 11+ | —          |
| `ContentBlocker.reload`   | ✅ iOS 11+ | —          |
| `LiveActivity.*`          | ✅ iOS 16.2+ | —        |
| `close()`                 | ✅ iOS 13+ | 🔜         |
| `openHostApp()`           | ✅ iOS 13+ | 🔜         |
| `getSharedData()`         | ✅ iOS 13+ | 🔜         |

### Extension Types by Platform

| Type         | iOS            | Android                      |
| ------------ | -------------- | ---------------------------- |
| `widget`     | ✅ iOS 14+     | ✅ API 26+ (Glance: API 33+) |
| `clip`       | ✅ iOS 14+     | —                            |
| `stickers`   | ✅ iOS 10+     | —                            |
| `messages`   | ✅ iOS 10+     | —                            |
| `share`      | ✅ iOS 8+      | 🔜                           |
| `action`     | ✅ iOS 8+      | 🔜                           |
| `wallet`     | 🧱 iOS 14+     | —                            |
| `intent`     | 🧱 iOS 12+     | —                            |
| `app-intent` | 🧱 iOS 16+     | —                            |
| Others       | 🧱 Scaffold    | —                            |

**Legend:** ✅ Production ready · 🧱 Scaffold + example · 🔜 Planned · — Not applicable

> **Note:** Only **stickers** is asset-only (`requiresCode: false`). Other types (`wallet`, NE family, etc.) are scaffold + real principals — see [limits.md](./limits.md). Do not add orphan ExtensionTypes without example + Devicewright row ([deprecations.md](./deprecations.md)). Full type set: [configuration.md](./configuration.md).

### Android Notes

- **Widgets** use SharedPreferences for data storage (equivalent to iOS App Groups)
- **Glance widgets** require Android 13+ (API 33) for full Compose support
- **RemoteViews widgets** work on Android 8+ (API 26) with XML layouts
- **Widget refresh** triggers via BroadcastReceiver

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
