# Configuration Reference

Every target is configured with an `expo-target.config.json` file in its directory.

## Basic Structure

**iOS-only widget:**

```
targets/my-widget/
├── expo-target.config.json   ← Configuration file
├── index.ts                  ← JS API for your app
└── ios/
    └── Widget.swift          ← SwiftUI code
```

**Cross-platform widget (iOS + Android):**

```
targets/my-widget/
├── expo-target.config.json
├── index.ts
├── ios/
│   └── Widget.swift          ← SwiftUI code
└── android/
    ├── MyWidget.kt           ← Widget logic (Glance or RemoteViews)
    ├── MyWidgetView.kt       ← UI composable (Glance only)
    └── res/
        ├── xml/
        │   └── widget_info.xml   ← Auto-generated widget metadata
        └── layout/               ← XML layouts (RemoteViews only)
```

> **Note:** For Glance widgets, you write Kotlin composables. For RemoteViews widgets, you write XML layouts. See [Android Widget Types](#widget-types) below.

## Minimal Configuration

```json
{
  "type": "widget",
  "name": "MyWidget",
  "platforms": ["ios"],
  "appGroup": "group.com.yourcompany.yourapp"
}
```

## Required Fields

| Field       | Description                                                                        |
| ----------- | ---------------------------------------------------------------------------------- |
| `type`      | Extension type (see [Extension Types Reference](#extension-types-reference) below) |
| `name`      | Target identifier (PascalCase, e.g., `MyWidget`)                                   |
| `platforms` | Array of platforms: `["ios"]`, `["android"]`, or `["ios", "android"]`              |

## Optional Fields

| Field              | Default     | Description                                                                                                                                                      |
| ------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `displayName`      | `name`      | Human-readable name shown in widget picker                                                                                                                       |
| `appGroup`         | _inherited_ | App Group ID. If not specified, automatically inherited from your main app's `app.json` entitlements (see [App Group Inheritance](#app-group-inheritance) below) |
| `entry`            | —           | React Native entry point for share/action/clip/messages (see [Entry Field](#entry-field) below)                                                                  |
| `excludedPackages` | `[]`        | Packages to exclude from RN bundle                                                                                                                               |

### Entry Field

The `entry` field specifies the React Native entry point for extensions that use React Native UI.

```json
{
  "entry": "./targets/share-ext/index.tsx"
}
```

**Path resolution:**

- Paths are **relative to your project root** (where `package.json` is)
- Must start with `./`
- Points to the file containing `createTarget()` with your component

**Example project structure:**

```
my-app/
├── package.json
├── app.json
├── App.tsx
└── targets/
    └── share-ext/
        ├── expo-target.config.json   ← entry: "./targets/share-ext/index.tsx"
        └── index.tsx                 ← Contains createTarget('ShareExt', Component)
```

---

## App Group Inheritance

> **⚠️ Important:** If you don't configure App Groups correctly, data sharing between your app and extensions will fail silently.

If you don't specify `appGroup` in your target config, it's automatically inherited from your main app's entitlements in `app.json`:

```json
// app.json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.security.application-groups": ["group.com.yourapp"]
      }
    }
  }
}
```

The first App Group in the array is used. If no App Group is configured in `app.json`, you **must** specify `appGroup` in each target config.

**Best practice:** Always use the same App Group ID everywhere:

- If your bundle ID is `com.yourcompany.myapp`
- Use `group.com.yourcompany.myapp` as your App Group

**Verification checklist:**

| Location                              | Value must be                   |
| ------------------------------------- | ------------------------------- |
| `app.json` entitlements               | `group.com.yourcompany.myapp`   |
| `expo-target.config.json`             | `group.com.yourcompany.myapp`   |
| Swift code `UserDefaults(suiteName:)` | `"group.com.yourcompany.myapp"` |

---

## iOS Configuration

Add iOS-specific options under the `ios` key:

```json
{
  "type": "widget",
  "name": "MyWidget",
  "platforms": ["ios"],
  "ios": {
    "deploymentTarget": "14.0",
    "colors": {
      "AccentColor": "#007AFF",
      "Background": { "light": "#FFFFFF", "dark": "#1C1C1E" }
    }
  }
}
```

### Common iOS Options

| Option              | Default   | Description                                                                                                                                                                                                 |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploymentTarget`  | type min  | Minimum iOS version. Defaults to type minimum (widget: 14.0, share: 8.0, etc.) or inherits from main app if higher                                                                                          |
| `bundleIdentifier`  | auto      | Bundle ID. Use `.widget` suffix for relative to main app (e.g., `.widget` becomes `com.yourapp.widget`)                                                                                                     |
| `colors`            | `{}`      | Named colors for Assets.xcassets                                                                                                                                                                            |
| `images`            | `{}`      | Named images for Assets.xcassets                                                                                                                                                                            |
| `frameworks`        | _by type_ | Additional frameworks to link                                                                                                                                                                               |
| `entitlements`      | `{}`      | Custom entitlements                                                                                                                                                                                         |
| `infoPlist`         | `{}`      | Custom Info.plist entries (deep merged with defaults)                                                                                                                                                       |
| `icon`              | —         | Path to extension icon file                                                                                                                                                                                 |
| `targetIcon`        | —         | Stickers: icon path. Actions: SF Symbol name (e.g., `"photo.fill"`) or image asset name. SF Symbols are Apple's icon library — browse in [SF Symbols app](https://developer.apple.com/sf-symbols/) or Xcode |
| `activationRules`   | —         | Share/action extension content types                                                                                                                                                                        |
| `preprocessingFile` | —         | JS file for web content preprocessing                                                                                                                                                                       |

### Default Frameworks by Type

| Type             | Default Frameworks                          |
| ---------------- | ------------------------------------------- |
| `widget`         | WidgetKit, SwiftUI, ActivityKit, AppIntents |
| `clip`           | SwiftUI, AppClip                            |
| `stickers`       | Messages                                    |
| `messages`       | Messages                                    |
| `share`          | Social, MobileCoreServices                  |
| `action`         | MobileCoreServices                          |
| `safari`         | SafariServices, WebKit                      |
| `notification-*` | UserNotifications, UserNotificationsUI      |

### Colors

Define colors with light/dark mode support:

```json
{
  "ios": {
    "colors": {
      "AccentColor": "#007AFF",
      "Background": { "light": "#FFFFFF", "dark": "#1C1C1E" }
    }
  }
}
```

**Supported formats:**

- Hex: `"#RGB"`, `"#RRGGBB"`, `"#RRGGBBAA"`
- RGB: `"rgb(255, 0, 0)"`
- RGBA: `"rgba(255, 0, 0, 0.5)"`
- Named: CSS color names like `"red"`, `"blue"`

**Light/dark mode:**

```json
{ "light": "#FFFFFF", "dark": "#000000" }
// or
{ "color": "#FFFFFF", "darkColor": "#000000" }
```

Use in Swift:

```swift
Color("AccentColor")
Color("Background")
```

### Images

Reference image assets:

```json
{
  "ios": {
    "images": {
      "Logo": "./assets/logo.png"
    }
  }
}
```

Use in Swift:

```swift
Image("Logo")
```

---

## Android Configuration

Android widgets are supported using either **Glance** (Jetpack Compose) or **RemoteViews** (traditional XML).

```json
{
  "type": "widget",
  "name": "MyWidget",
  "platforms": ["android"],
  "android": {
    "widgetType": "glance",
    "minWidth": "180dp",
    "minHeight": "110dp",
    "resizeMode": "horizontal|vertical"
  }
}
```

### Android Options

| Option               | Default                  | Description                                                         |
| -------------------- | ------------------------ | ------------------------------------------------------------------- |
| `widgetType`         | `"glance"`               | `"glance"` (Compose, API 33+) or `"remoteviews"` (XML, API 26+)     |
| `minWidth`           | `"180dp"`                | Minimum widget width                                                |
| `minHeight`          | `"110dp"`                | Minimum widget height                                               |
| `resizeMode`         | `"horizontal\|vertical"` | `"none"`, `"horizontal"`, `"vertical"`, or `"horizontal\|vertical"` |
| `updatePeriodMillis` | `0`                      | Auto-update interval (0 = disabled, use manual refresh)             |
| `widgetCategory`     | `"home_screen"`          | `"home_screen"` or `"keyguard"` (lock screen)                       |
| `previewImage`       | auto                     | Preview drawable name for widget picker                             |
| `description`        | —                        | Widget description in picker                                        |
| `targetCellWidth`    | —                        | Target cell width (Material You widgets)                            |
| `targetCellHeight`   | —                        | Target cell height (Material You widgets)                           |
| `colors`             | `{}`                     | Named colors for Android resources                                  |

### Widget Types

Choose between two Android widget rendering approaches:

**Glance (Recommended)**

- Modern Jetpack Compose-based widgets using Google's Glance API
- Full Material 3 support with modern UI components
- Requires Android 13+ (API 33+) for best results
- Larger bundle size (~3-5MB Compose dependencies)
- Best for: New projects, Material Design 3, modern Android features

**RemoteViews**

- Traditional XML layout-based widgets using Android's RemoteViews API
- Works on Android 8+ (API 26+)
- Minimal dependencies (~200KB)
- Limited UI (no LazyColumn, basic views only)
- Best for: Smaller apps, broader device support, simple layouts

---

## Android Quick Start

> **Note:** Android widget support is production-ready but requires more manual setup than iOS.

### 1. Configure for Android

```json
{
  "type": "widget",
  "name": "MyWidget",
  "displayName": "My Widget",
  "platforms": ["android"],
  "android": {
    "widgetType": "glance",
    "minWidth": "180dp",
    "minHeight": "110dp"
  }
}
```

### 2. Create the Glance Widget

Create `targets/my-widget/android/MyWidget.kt`:

```kotlin
package com.yourcompany.yourapp.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.Text
import androidx.glance.unit.dp

class MyWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Read data from SharedPreferences (set by expo-targets)
        val prefs = context.getSharedPreferences("group.com.yourcompany.yourapp", Context.MODE_PRIVATE)
        val message = prefs.getString("message", "No message yet") ?: "No message yet"

        provideContent {
            Column(
                modifier = GlanceModifier.fillMaxSize().padding(16.dp)
            ) {
                Text("My Widget")
                Text(message)
            }
        }
    }
}

class MyWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MyWidget()
}
```

### 3. Build and Run

```bash
npx expo prebuild
npx expo run:android
```

### 4. Update from React Native

```typescript
import { createTarget } from 'expo-targets';

const widget = createTarget('MyWidget');
widget.setData({ message: 'Hello from React Native!' });
widget.refresh();
```

---

## Cross-Platform Widget

```json
{
  "type": "widget",
  "name": "MyWidget",
  "platforms": ["ios", "android"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "deploymentTarget": "14.0",
    "colors": {
      "AccentColor": "#007AFF"
    }
  },
  "android": {
    "widgetType": "glance",
    "minWidth": "180dp",
    "minHeight": "110dp",
    "colors": {
      "accent_color": "#007AFF"
    }
  }
}
```

### Android Colors

```json
{
  "android": {
    "colors": {
      "accent_color": { "light": "#007AFF", "dark": "#0A84FF" },
      "background": { "light": "#FFFFFF", "dark": "#1C1C1E" },
      "text_primary": "#000000"
    }
  }
}
```

---

## Extension-Specific Configuration

### Widget (iOS)

```json
{
  "type": "widget",
  "name": "WeatherWidget",
  "displayName": "Weather",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "deploymentTarget": "14.0",
    "colors": {
      "AccentColor": { "light": "#007AFF", "dark": "#0A84FF" }
    }
  }
}
```

### Widget (Android)

```json
{
  "type": "widget",
  "name": "WeatherWidget",
  "displayName": "Weather",
  "platforms": ["android"],
  "android": {
    "widgetType": "glance",
    "minWidth": "250dp",
    "minHeight": "180dp",
    "resizeMode": "horizontal|vertical",
    "description": "Shows current weather",
    "colors": {
      "background": { "light": "#FFFFFF", "dark": "#1C1C1E" }
    }
  }
}
```

### App Clip

```json
{
  "type": "clip",
  "name": "QuickOrder",
  "displayName": "Quick Order",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "deploymentTarget": "14.0",
    "entitlements": {
      "com.apple.developer.associated-domains": ["appclips:yourapp.example.com"]
    }
  }
}
```

### Share Extension

```json
{
  "type": "share",
  "name": "ShareToApp",
  "displayName": "Share to My App",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "deploymentTarget": "13.0",
    "activationRules": [
      { "type": "text" },
      { "type": "url" },
      { "type": "image", "maxCount": 5 }
    ]
  }
}
```

### Activation Rules

Control what content types your share/action extension accepts:

| Type      | Description                              | Supports maxCount |
| --------- | ---------------------------------------- | ----------------- |
| `text`    | Plain text content                       | No                |
| `url`     | URLs (including web URLs)                | Yes               |
| `image`   | Image files (jpg, png, gif, etc.)        | Yes               |
| `video`   | Video files (mov, mp4, etc.)             | Yes               |
| `file`    | Generic files                            | Yes               |
| `webpage` | Web pages (requires `preprocessingFile`) | Yes               |

```json
{
  "ios": {
    "activationRules": [
      { "type": "text" },
      { "type": "url" },
      { "type": "image", "maxCount": 10 },
      { "type": "video", "maxCount": 1 }
    ]
  }
}
```

### Action Extension

```json
{
  "type": "action",
  "name": "ProcessImage",
  "displayName": "Edit with MyApp",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "deploymentTarget": "13.0",
    "targetIcon": "photo.fill",
    "activationRules": [{ "type": "image", "maxCount": 1 }]
  }
}
```

The `targetIcon` for action extensions can be an SF Symbol name (e.g., `"photo.fill"`) or an image asset name.

### Share Extension with React Native

```json
{
  "type": "share",
  "name": "ShareToApp",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "entry": "./targets/share-to-app/index.tsx",
  "excludedPackages": ["expo-updates", "expo-dev-client"],
  "ios": {
    "activationRules": [{ "type": "url" }]
  }
}
```

### Web Page Preprocessing

For share extensions that need to extract data from web pages:

```json
{
  "type": "share",
  "name": "SaveArticle",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "activationRules": [{ "type": "webpage" }],
    "preprocessingFile": "./preprocessing.js"
  }
}
```

Create `preprocessing.js`:

```javascript
var ExtensionPreprocessingJS = {
  run: function (args) {
    args.completionFunction({
      url: document.URL,
      title: document.title,
      selection: window.getSelection().toString(),
    });
  },
};
```

Access via `getSharedData().preprocessedData` in your extension.

### iMessage Stickers

```json
{
  "type": "stickers",
  "name": "FunStickers",
  "displayName": "Fun Stickers",
  "platforms": ["ios"],
  "ios": {
    "deploymentTarget": "10.0",
    "targetIcon": "./assets/imessage-icon.png"
  }
}
```

Place sticker images (PNG) directly in the target's `ios/` folder. They're auto-discovered.

For organized sticker packs:

```json
{
  "ios": {
    "stickerPacks": [
      {
        "name": "Animals",
        "assets": ["./stickers/cat.png", "./stickers/dog.png"]
      },
      {
        "name": "Emojis",
        "assets": ["./stickers/happy.png", "./stickers/sad.png"]
      }
    ]
  }
}
```

**⚠️ iOS Limitation:** You cannot have both a `stickers` target and a `messages` target in the same app. iOS only allows one message payload provider extension per app. Both types use the same extension point identifier (`com.apple.message-payload-provider`). Choose either stickers OR a messages app, but not both.

### Messages App

```json
{
  "type": "messages",
  "name": "MyMessagesApp",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "entry": "./targets/my-messages-app/index.tsx"
}
```

**⚠️ iOS Limitation:** You cannot have both a `messages` target and a `stickers` target in the same app. iOS only allows one message payload provider extension per app. Both types use the same extension point identifier (`com.apple.message-payload-provider`). Choose either a messages app OR stickers, but not both.

### Wallet Extension

```json
{
  "type": "wallet",
  "name": "MyWalletExt",
  "displayName": "My Wallet",
  "platforms": ["ios"],
  "ios": {
    "deploymentTarget": "13.0",
    "entitlements": {
      "com.apple.developer.pass-type-identifiers": ["$(TeamIdentifierPrefix)*"]
    }
  }
}
```

**Requirements:**

- Requires Apple Developer Program membership
- Must have pass type identifiers configured in Apple Developer portal
- Requires server-side pass generation and signing infrastructure
- See [Apple's Wallet documentation](https://developer.apple.com/documentation/passkit/wallet) for complete setup

**Implementation:**

You must create `ios/PassProvider.swift` that conforms to `PKIssuerProvisioningExtensionHandler`:

```swift
import PassKit

class PassProvider: NSObject, PKIssuerProvisioningExtensionHandler {
    func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
        let status = PKIssuerProvisioningExtensionStatus()
        status.requiresAuthentication = true
        status.passEntriesAvailable = true
        completion(status)
    }

    func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]?, Error?) -> Void) {
        // Return available passes that can be added to Wallet
        completion([], nil)
    }

    func generateAddPaymentPassRequestForPassEntryWithIdentifier(
        _ identifier: String,
        configuration: PKAddPaymentPassRequestConfiguration,
        certificateChain: [Data],
        nonce: Data,
        nonceSignature: Data,
        completionHandler: @escaping (PKAddPaymentPassRequest) -> Void
    ) {
        // Generate encrypted pass data from your server
        let request = PKAddPaymentPassRequest()
        completionHandler(request)
    }
}
```

---

## Dynamic Configuration

Use `.js` or `.ts` for dynamic configs that need to access your Expo app configuration:

```typescript
// expo-target.config.ts
import type { ExpoConfig } from 'expo/config';

/**
 * Dynamic config function receives the resolved Expo app config.
 * Useful for deriving values from your main app configuration.
 */
export default function (config: ExpoConfig) {
  return {
    type: 'widget',
    name: 'MyWidget',
    platforms: ['ios'],
    // Derive App Group from bundle identifier
    appGroup: `group.${config.ios?.bundleIdentifier || 'com.example.app'}`,
    ios: {
      // Inherit deployment target from main app
      deploymentTarget: config.ios?.deploymentTarget || '14.0',
    },
  };
}
```

**When to use dynamic configs:**

- Deriving `appGroup` from your app's bundle identifier
- Sharing deployment targets between app and targets
- Conditional configuration based on build variants
- Reusing values from your main app config

**The `config` parameter** contains the fully resolved Expo configuration from your `app.json` or `app.config.js`, including all plugin modifications. You can access:

- `config.ios?.bundleIdentifier` — Your app's bundle ID
- `config.ios?.deploymentTarget` — Your app's iOS deployment target
- `config.android?.package` — Your app's Android package name
- Any other fields from your Expo config

**Note:** Dynamic configs (`.ts`/`.js`) are processed by expo-targets during prebuild. TypeScript is supported without additional configuration — the plugin handles transpilation.

---

## Extension Types Reference

| Type                      | iOS           | Android    | Description             |
| ------------------------- | ------------- | ---------- | ----------------------- |
| `widget`                  | ✅ iOS 14+    | ✅ API 26+ | Home screen widgets     |
| `clip`                    | ✅ iOS 14+    | —          | App Clips               |
| `stickers`                | ✅ iOS 10+    | —          | iMessage sticker packs  |
| `messages`                | ✅ iOS 10+    | —          | iMessage apps           |
| `share`                   | ✅ iOS 8+     | 🔜         | Share extensions        |
| `action`                  | ✅ iOS 8+     | 🔜         | Action extensions       |
| `wallet`                  | 📋 iOS 13+    | —          | Wallet extensions       |
| `safari`                  | 📋 iOS 15+    | —          | Safari web extensions   |
| `notification-content`    | 📋 iOS 10+    | 🔜         | Rich notification UI    |
| `notification-service`    | 📋 iOS 10+    | 🔜         | Notification processing |
| `intent`                  | 📋 iOS 12+    | —          | Siri intents            |
| `intent-ui`               | 📋 iOS 12+    | —          | Siri intent UI          |
| `spotlight`               | 📋 iOS 9+     | —          | Spotlight index         |
| `bg-download`             | 📋 iOS 7+     | —          | Background downloads    |
| `quicklook-thumbnail`     | 📋 iOS 11+    | —          | QuickLook thumbnails    |
| `location-push`           | 📋 iOS 15+    | —          | Location push service   |
| `credentials-provider`    | 📋 iOS 12+    | —          | Credential provider     |
| `account-auth`            | 📋 iOS 12.2+  | —          | Account authentication  |
| `app-intent`              | 📋 iOS 16+    | —          | App intents             |
| `device-activity-monitor` | 📋 iOS 15+    | —          | Device activity monitor |
| `matter`                  | 📋 iOS 16.1+  | —          | Matter extensions       |
| `watch`                   | 📋 watchOS 2+ | —          | Watch app               |

**Legend:** ✅ Production ready · 📋 Config-only (bring your own Swift/Kotlin) · 🔜 Planned · — Not applicable

### iOS Limitations

**Message Payload Provider Extension Limit**

iOS only allows **one message payload provider extension** per app. This means you cannot have both a `stickers` target and a `messages` target in the same app, as both use the extension point identifier `com.apple.message-payload-provider`.

**Error if violated:**

```
Multiple message payload provider extensions found in app but only one is allowed
```

**Solution:** Choose either:

- A `stickers` target (static sticker packs), OR
- A `messages` target (interactive iMessage app)

You cannot use both in the same app. If you need both features, consider:

- Creating separate apps for each
- Using a messages app that includes sticker functionality programmatically

**Reference:** [Apple's Messages Framework Documentation](https://developer.apple.com/documentation/messages)

### Config-Only Types

Config-only types (`📋`) generate the Xcode target structure and Info.plist configuration, but **you must write all Swift/Kotlin code yourself**. These are for advanced use cases where you need full control over the implementation.

**What expo-targets provides:**

- Xcode target creation with correct extension point identifier
- Info.plist configuration
- Framework linking
- Entitlements setup
- Build system integration

**What you must provide:**

- All Swift/Kotlin source files
- Entry point classes conforming to required protocols
- Complete implementation logic

**Example: Safari Extension (config-only)**

Safari extensions support two modes: **React Native Web** (write React components) or **Native** (manual HTML/JS/CSS). Both modes auto-generate the Swift handler for you.

### Mode 1: React Native Web (Recommended)

Write your Safari extension popup using React Native components. The same `createTarget` API used for share/action extensions works here.

**Minimal setup:**

```
targets/my-safari/
├── expo-target.config.json
└── src/
    └── SafariExtension.tsx
```

That's it! The Swift handler, popup.html, manifest.json, and other resources are auto-generated during prebuild.

**Config (`expo-target.config.json`):**

```json
{
  "type": "safari",
  "name": "MySafariExt",
  "displayName": "My Safari Extension",
  "entry": "./targets/my-safari/src/SafariExtension.tsx",
  "platforms": ["ios"],
  "ios": {
    "manifest": {
      "permissions": ["storage", "activeTab"],
      "description": "My awesome Safari extension"
    }
  }
}
```

**Entry file (`src/SafariExtension.tsx`):**

```tsx
import { createTarget, useBrowserTab, useBrowserStorage } from 'expo-targets';
import { View, Text, Button, StyleSheet } from 'react-native';

function SafariPopup({ target }) {
  const tab = useBrowserTab();
  const [count, setCount] = useBrowserStorage('clickCount', 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Safari Extension</Text>
      {tab && <Text style={styles.url}>{tab.url}</Text>}
      <Text>Clicked: {count} times</Text>
      <Button title="Click me" onPress={() => setCount(count + 1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, minWidth: 300 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  url: { fontSize: 12, color: '#666', marginBottom: 12 },
});

export default createTarget('MySafariExt', SafariPopup);
```

**Available Safari hooks:**

```tsx
import {
  useBrowserTab, // Get current tab info (url, title)
  useBrowserStorage, // Sync storage (across devices)
  useLocalBrowserStorage, // Local storage
  useSendToContentScript, // Send message to content script
  useSendToNative, // Send message to Swift handler
  useMessageListener, // Listen for messages
  openTab, // Open new tab
  closePopup, // Close extension popup
  copyToClipboard, // Copy text
} from 'expo-targets';
```

**Building the bundle:**

After `npx expo prebuild`, build the web bundle:

```bash
# From your project root
npx expo export --platform web --output-dir ios/build/safari-resources

# Copy to extension Resources (the prebuild creates a placeholder popup.js)
cp ios/build/safari-resources/bundle.js ios/[AppName]/targets/[ExtName]/ios/build/Resources/popup.js
```

### Mode 2: Native/Manual

For full control, provide your own web resources without an `entry` field. The Swift handler is still auto-generated.

**Minimal setup:**

```
targets/my-safari/
├── expo-target.config.json
└── ios/
    └── Resources/
        ├── manifest.json
        ├── popup.html
        ├── popup.js
        └── ... (your web assets)
```

**Config:**

```json
{
  "type": "safari",
  "name": "MySafariExt",
  "platforms": ["ios"]
}
```

**Full directory structure:**

```
targets/my-safari/
├── expo-target.config.json
└── ios/
    └── Resources/
        ├── manifest.json          ← Required: Web extension manifest
        ├── _locales/
        │   └── en/
        │       └── messages.json  ← Localized strings
        ├── background.js          ← Background script
        ├── content.js             ← Content script (optional)
        ├── popup.html             ← Popup UI (optional)
        ├── popup.js               ← Popup logic (optional)
        ├── popup.css              ← Popup styles (optional)
        └── images/
            ├── icon-48.png        ← Extension icons
            ├── icon-96.png
            ├── icon-128.png
            └── toolbar-icon.svg   ← Toolbar icon
```

**Required `manifest.json`:**

```json
{
  "manifest_version": 3,
  "default_locale": "en",
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__",
  "version": "1.0",
  "icons": {
    "48": "images/icon-48.png",
    "96": "images/icon-96.png",
    "128": "images/icon-128.png"
  },
  "background": {
    "scripts": ["background.js"],
    "type": "module"
  },
  "content_scripts": [
    {
      "js": ["content.js"],
      "matches": ["*://example.com/*"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "images/toolbar-icon.svg"
  },
  "permissions": []
}
```

> **Note:** The `SafariWebExtensionHandler.swift` file is auto-generated during prebuild. If you need to customize native message handling, you can create your own at `ios/SafariWebExtensionHandler.swift` and it won't be overwritten.

> Safari web extensions use standard Web Extension APIs. See [Apple's Safari Web Extensions documentation](https://developer.apple.com/documentation/safariservices/safari_web_extensions) for details.

**Example: Notification Service Extension**

```json
{
  "type": "notification-service",
  "name": "MyNotificationService",
  "platforms": ["ios"],
  "ios": {
    "deploymentTarget": "15.0"
  }
}
```

Create `ios/NotificationService.swift`:

```swift
import UserNotifications

class NotificationService: UNNotificationServiceExtension {
    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest,
                            withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        if let bestAttemptContent = bestAttemptContent {
            // Modify the notification content
            bestAttemptContent.title = "\(bestAttemptContent.title) [modified]"
            contentHandler(bestAttemptContent)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }
}
```

> **Important:** Notification Service Extensions require push notifications to have `"mutable-content": 1` in the payload.

**Example: Notification Content Extension**

```json
{
  "type": "notification-content",
  "name": "MyNotificationContent",
  "platforms": ["ios"],
  "ios": {
    "deploymentTarget": "15.0",
    "infoPlist": {
      "NSExtension": {
        "NSExtensionAttributes": {
          "UNNotificationExtensionCategory": "MY_CATEGORY",
          "UNNotificationExtensionInitialContentSizeRatio": 0.3,
          "UNNotificationExtensionDefaultContentHidden": false
        }
      }
    }
  }
}
```

Create `ios/NotificationViewController.swift`:

```swift
import UIKit
import UserNotifications
import UserNotificationsUI

class NotificationViewController: UIViewController, UNNotificationContentExtension {
    override func viewDidLoad() {
        super.viewDidLoad()
        // Setup your custom UI
    }

    func didReceive(_ notification: UNNotification) {
        // Update UI with notification content
        let content = notification.request.content
        // Use content.title, content.body, content.userInfo, etc.
    }
}
```

> **Important:** The `UNNotificationExtensionCategory` must match the category set in your push notification payload. Register categories in your main app using `UNUserNotificationCenter.current().setNotificationCategories()`.

**Example: Intent Extension (Siri)**

```json
{
  "type": "intent",
  "name": "MyIntentHandler",
  "platforms": ["ios"],
  "ios": {
    "infoPlist": {
      "NSExtension": {
        "NSExtensionAttributes": {
          "IntentsSupported": [
            "INSendMessageIntent",
            "INSearchForMessagesIntent"
          ]
        }
      }
    }
  }
}
```

Create `ios/IntentHandler.swift`:

```swift
import Intents

class IntentHandler: INExtension, INSendMessageIntentHandling {
    override func handler(for intent: INIntent) -> Any {
        return self
    }

    func handle(intent: INSendMessageIntent, completion: @escaping (INSendMessageIntentResponse) -> Void) {
        let response = INSendMessageIntentResponse(code: .success, userActivity: nil)
        completion(response)
    }
}
```

> **Important:** The main app must have the Siri capability enabled in entitlements. Users must also grant Siri permission.

**Required protocols by type:**

| Type                   | Required Protocol/Class                | Documentation                                                                                              |
| ---------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `wallet`               | `PKIssuerProvisioningExtensionHandler` | [Apple Docs](https://developer.apple.com/documentation/passkit/pkissuerprovisioningextensionhandler)       |
| `safari`               | `NSExtensionRequestHandling`           | [Apple Docs](https://developer.apple.com/documentation/safariservices/safari_web_extensions)               |
| `notification-content` | `UNNotificationContentExtension`       | [Apple Docs](https://developer.apple.com/documentation/usernotificationsui/unnotificationcontentextension) |
| `notification-service` | `UNNotificationServiceExtension`       | [Apple Docs](https://developer.apple.com/documentation/usernotifications/unnotificationserviceextension)   |
| `intent`               | `INExtension`                          | [Apple Docs](https://developer.apple.com/documentation/sirikit/inextension)                                |
| `intent-ui`            | `INUIHostedViewControlling`            | [Apple Docs](https://developer.apple.com/documentation/intentsui/inuihostedviewcontrolling)                |

**Tips:**

- Check the generated Xcode project to see what files are expected
- Refer to Apple's documentation for each extension type's requirements
- Start with a working example from Apple's sample code
- Use the generated Info.plist as a reference for required keys

---

## Recommended Deployment Targets

| Type       | Recommended | Minimum  |
| ---------- | ----------- | -------- |
| `widget`   | `"14.0"`    | iOS 14.0 |
| `clip`     | `"14.0"`    | iOS 14.0 |
| `stickers` | `"10.0"`    | iOS 10.0 |
| `messages` | `"14.0"`    | iOS 10.0 |
| `share`    | `"13.0"`    | iOS 8.0  |
| `action`   | `"13.0"`    | iOS 8.0  |
| `wallet`   | `"13.0"`    | iOS 13.0 |

---

## Troubleshooting

### Config not detected?

**Symptoms:** Target doesn't appear after prebuild

**Solutions:**

- Ensure file is named `expo-target.config.json` (or `.js`/`.ts`)
- Check JSON syntax (validate at jsonlint.com)
- Re-run `npx expo prebuild --clean`

### Colors not appearing?

**Symptoms:** `Color("AccentColor")` shows default color in Swift

**Solutions:**

- Verify color format (hex: `#RRGGBB` or `#RGB`)
- Check color name in Swift matches config key exactly (case-sensitive)
- Look in `ios/{target}/Assets.xcassets/` to verify colors were generated

### Build errors about frameworks?

**Symptoms:** `No such module 'WidgetKit'` or similar

**Solutions:**

- Check `deploymentTarget` meets minimum for extension type
- Verify framework names are correct (case-sensitive)
- Run `cd ios && pod install` after config changes

### App Group not working?

**Symptoms:** Widget shows default data, not data set from app

**Verification:**

```bash
# Check all three locations match exactly:
grep -r "group.com" app.json
grep -r "appGroup" targets/*/expo-target.config.json
grep -r "suiteName" targets/*/ios/*.swift
```

All three should show the identical App Group ID.
