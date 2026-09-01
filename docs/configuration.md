# Configuration Reference

**Source of truth for** `expo-target.config` options and extension types.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-31 -->

> **Orphan-stub freeze:** do not add new `ExtensionType` values without registry, scaffold, example, and Devicewright row. See [deprecations.md](./deprecations.md). Widgets policy: [widgets.md](./widgets.md).

Each target uses an `expo-target.config.json` file in its directory.

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
| `displayName`      | `name`      | Drawer label only (`CFBundleDisplayName` / `CFBundleName` on iOS; widget picker). Xcode product, Pod target, and pbx name use `name` (`Messages` → `MessagesTarget`). |
| `appGroup`         | _inherited_ | App Group ID. When omitted, inherits from your main app's `app.json` entitlements (see [App Group Inheritance](#app-group-inheritance) below) |
| `entry`            | —           | React Native entry point for share, action, clip, and messages (see [Entry Field](#entry-field) below)                                                                  |
| `excludedPackages` | auto for RN `entry` | Force-strip extra packages from the nested `ExpoModulesProvider` and the extension linker. For RN `entry` targets, unused autolinked host packages are stripped by default. Crash-class packages (`expo-updates`, `expo-dev-client`, `expo-dev-launcher`, `expo-dev-menu`) always merge. Do not use this field as a keep-list. |
| `linkedPackages` | `[]` | Force-keep these autolinked packages on the extension when the JS entry does not import them. |

### Entry Field

The `entry` field specifies the React Native entry point for extensions that use React Native UI.

```json
{
  "entry": "./targets/share-ext/index.tsx"
}
```

**Path resolution:**

- Paths are **relative to your project root** (where `package.json` is).
- Each path must start with `./`.
- Each path points to the file that contains `createTarget()` with your component.

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

> **⚠️ Important:** When App Groups are wrong, data sharing between your app and extensions fails silently.

When you omit `appGroup` in your target config, it inherits automatically from your main app's entitlements in `app.json`:

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

The first App Group in the array is used. When no App Group is configured in `app.json`, you **must** specify `appGroup` in each target that needs one.

**App Clips** do not inherit host App Groups. If the Clip does not share data, omit `appGroup` and do not set `com.apple.security.application-groups`. An empty list also omits the key, so AdHoc codesign can match a Clip profile that has no App Groups capability. Set `appGroup` or a non-empty group list only when the Clip shares data with the host.

**Best practice:** Use the same App Group ID everywhere:

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
| `nativeLink`        | `entry`   | RN `entry` targets only. `entry` strips unused autolinked packages from the provider and the `Pods-<Target>` linker. `host` keeps the old fat host copy. |
| `entitlements`      | `{}`      | Custom entitlements                                                                                                                                                                                         |
| `infoPlist`         | `{}`      | Custom Info.plist entries (deep merged with defaults)                                                                                                                                                       |
| `icon`              | —         | Path to extension icon file                                                                                                                                                                                 |
| `targetIcon`        | —         | Stickers and messages: icon path (generates `iMessage App Icon.stickersiconset`). Actions: SF Symbol name (e.g., `"photo.fill"`) or image asset name. SF Symbols are Apple's icon library — browse in [SF Symbols app](https://developer.apple.com/sf-symbols/) or Xcode |
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

### CocoaPods Dependencies (pods.rb)

Add a `pods.rb` file in your target's `ios/` directory to include custom CocoaPods dependencies. This is useful for third-party SDKs like Firebase in extension targets.

**File structure:**

```
targets/my-widget/
├── expo-target.config.json
└── ios/
    ├── pods.rb                ← Custom CocoaPods configuration
    └── Widget.swift
```

**Example `pods.rb` for Firebase:**

```ruby
# targets/my-widget/ios/pods.rb
pod 'Firebase/Auth'
pod 'Firebase/Firestore'
```

The contents of `pods.rb` are injected into the target block in the generated Podfile:

```ruby
# Generated Podfile (after prebuild)
target 'MyWidgetTarget' do
    use_frameworks! :linkage => :static
    platform :ios, '14.0'
    # From pods.rb:
    pod 'Firebase/Auth'
    pod 'Firebase/Firestore'
end
```

**Advanced example with React Native setup:**

For App Clips or other targets that need full React Native support:

```ruby
# targets/my-clip/ios/pods.rb
require File.join(File.dirname(`node --print "require.resolve('react-native/package.json')"`), "scripts/react_native_pods")

exclude = []
use_expo_modules!(exclude: exclude)

config_command = [
  'node',
  '--no-warnings',
  '--eval',
  'require(require.resolve(\'expo-modules-autolinking\', { paths: [require.resolve(\'expo/package.json\')] }))(process.argv.slice(1))',
  'react-native-config',
  '--json',
  '--platform',
  'ios'
]

config = use_native_modules!(config_command)

use_react_native!(
  :path => config[:reactNativePath],
  :hermes_enabled => true,
  :app_path => "#{Pod::Config.instance.installation_root}/..",
)
```

> **Note:** The `pods.rb` file is evaluated inside the target's `do...end` block. Global CocoaPods properties are available through the `podfile_properties` variable.

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

Paths are relative to the target directory (`targets/<name>/`).

On iOS, prebuild copies each file into a generated `.imageset` in ExpoTargetsGenerated.
If `logo@2x.png` and `logo@3x.png` are in the same folder as `logo.png`, those scales are included.
SVG and PDF files use template rendering so SwiftUI can tint them.
A user imageset of the same name in `targets/<name>/ios/Assets.xcassets` is not replaced.

On Android, prebuild copies each file into `targets/<name>/android/res/drawable*`.
The resource name is `{sanitizedTarget}_{sanitizedKey}`.
For `HelloWidget` and `Logo`, Glance loads `R.drawable.hellowidget_logo`.
If density siblings exist, Android uses `drawable-mdpi`, `drawable-xhdpi`, and `drawable-xxhdpi`.
Android copies PNG, WebP, JPEG, GIF, and VectorDrawable XML.
Android does not copy SVG. Use a VectorDrawable XML file, or keep the SVG on iOS only.

```json
{
  "ios": {
    "images": {
      "Logo": "./assets/logo.png"
    }
  },
  "android": {
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

Use in Glance:

```kotlin
Image(
    provider = ImageProvider(R.drawable.hellowidget_logo),
    contentDescription = "Logo",
)
```

---

## Android Configuration

Android widgets are supported with **Glance** (Jetpack Compose) or **RemoteViews** (traditional XML).

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
| `initialLayout`      | `widget_<name>`          | RemoteViews layout resource (no `@layout/` prefix)                  |
| `providers`          | —                        | Opt-in list of AppWidgetProvider rows. Empty or omitted = 1:1 path  |
| `colors`             | `{}`                     | Named colors for Android resources                                  |
| `images`             | `{}`                     | Named images copied into `android/res/drawable*`                    |
| `implementation`     | `[]`                     | Extra Gradle `implementation("…")` coordinates on the host app      |
| `qr`                 | `false`                  | Inject ZXing core + `ExpoTargetsQr.encode` helper                   |

When `android.providers` is omitted or empty, the plugin registers one receiver from the scalar fields. The RemoteViews class name stays `{package}.widget.{sanitizedName}.{Pascal}Provider`. The Glance class name stays `{package}.widget.{sanitizedName}.{Pascal}WidgetReceiver`.

When `android.providers` has one or more rows, each row is a widget picker entry with its own FQCN and `widgetprovider_<name>.xml`. This is the Android dual of iOS `supportedFamilies` / WidgetBundle. Each row can set `name`, `displayName`, `className`, `initialLayout`, cell size, preview, and description. Omitted layout fields inherit from the scalar `android.*` object.

Set `className` to a full FQCN when an existing app already bound placed widgets to that class. A simple class name resolves under `{package}.widget.{sanitizedTarget}`. Do not change a shipped FQCN.

The plugin writes each `widgetprovider_*.xml` from the row fields. If the file already exists, the plugin updates those fields and keeps extra attributes that you added.

RemoteViews can use `providers` today. Glance can register more than one receiver the same way. You do not need to rewrite a RemoteViews target as Glance.

See `examples/widgets/targets/hello-remoteviews-bundle` (two layouts, not one layout at two sizes). Hello RemoteViews stays the 1:1 scalar path.

### Widget Types

Choose between two Android widget rendering approaches:

**Glance (Recommended)**

- Modern Jetpack Compose widgets with Google's Glance API
- Full Material 3 support with modern UI components
- Requires Android 13+ (API 33+) for best results
- Larger bundle size (~3-5MB Compose dependencies)
- Best for new projects, Material Design 3, and modern Android features

**RemoteViews**

- Traditional XML layout widgets with Android's RemoteViews API
- Works on Android 8+ (API 26+)
- Minimal dependencies (~200KB)
- Limited UI (no LazyColumn, basic views only)
- Best for smaller apps, broader device support, and simple layouts

---

## Android Quick Start

> **Note:** Android widget support is production-ready but needs more manual setup than iOS.

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

Create `targets/my-widget/android/MyWidget.kt` (flat, like `ios/Widget.swift`). Keep the FQCN in the `package` line. Do not nest `com/…` folders.

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
import { createTarget } from "expo-targets";

const widget = createTarget("MyWidget");
widget.setData(
  { message: "Hello from React Native!" },
  { refresh: true }
);
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
    "kinds": [
      { "name": "WeatherWidget", "displayName": "Weather" }
    ],
    "liveActivities": [
      {
        "attributesName": "WeatherAttributes",
        "static": { "location": "string" },
        "contentState": { "temp": "double", "summary": "string" }
      }
    ],
    "colors": {
      "AccentColor": { "light": "#007AFF", "dark": "#0A84FF" }
    }
  }
}
```

`ios.kinds` lists WidgetKit picker products (`name` matches `createTarget`). `supportedFamilies` on a kind is sizes of that one picker row, not extra products. Declare Live Activity on `ios.liveActivity` (one) or `ios.liveActivities` (two or more in the same `.appex`). Do not set both on one target. Each row holds `attributesName` / `static` / `contentState` / `pushType`. That drives sealed CNG for native widgets and `WidgetLiveActivity()` on expo-ui Bundles. A native widget with `ios.kinds` and no user `*Bundle.swift` also gets a sealed `@main` WidgetBundle (`<name>LiveActivity()` when a Live Activity is set). The plugin sets host `NSSupportsLiveActivities=true` (Apple requires the key on the app target). Ambient TypeScript payload types still land in `.expo/types/expo-targets.d.ts`. Host JS: `LiveActivity.create('WeatherAttributes')` or `folder.liveActivity('WeatherAttributes')`. See [api.md](./api.md) and [widgets.md](./widgets.md).

### File Provider domain (iOS)

```json
{
  "type": "file-provider",
  "name": "MyFiles",
  "platforms": ["ios"],
  "ios": {
    "fileProviderDomain": {
      "identifier": "com.example.app.files",
      "displayName": "My Files"
    }
  }
}
```

Identity is strict CNG for `FileProviderDomain.register()` and `unregister()`.

### Content Blocker reload (iOS)

Host JS calls `ContentBlocker.reload()` and `reload({ targetName })` with the plugin-derived bundle id. No extra config keys are needed beyond a normal `content-blocker` target.

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

Control what content types your share or action extension accepts:

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

The `targetIcon` for action extensions can be an SF Symbol name (for example `"photo.fill"`) or an image asset name.

### Share Extension with React Native

```json
{
  "type": "share",
  "name": "ShareToApp",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "entry": "./targets/share-to-app/index.tsx",
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

Access through `getSharedData().preprocessedData` in your extension.

### iMessage Stickers

```json
{
  "type": "stickers",
  "name": "FunStickers",
  "displayName": "Fun Stickers",
  "platforms": ["ios"],
  "ios": {
    "deploymentTarget": "10.0",
    "targetIcon": "./assets/imessage-icon.png",
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

Declare packs with `ios.stickerPacks`. Asset paths and `targetIcon` are relative to the **target directory** (where `expo-target.config.json` lives), not the app root.

The plugin hardcodes sticker pack **grid size to `regular`**. Provide @3x PNGs sized for that grid (Apple's Messages sticker sizes):

| Grid (Messages)                  | Points  | Pixels (@3x) |
| -------------------------------- | ------- | ------------ |
| Small                            | 100×100 | **300×300**  |
| Regular (default in this plugin) | 136×136 | **408×408**  |
| Large                            | 206×206 | **618×618**  |

Until `grid-size` is configurable, use **408×408** source stickers. Keep each sticker file under 500 KB.

**⚠️ iOS Limitation:** You cannot have both a `stickers` target and a `messages` target in the same app. iOS allows only one message payload provider extension per app. Both types use the same extension point identifier (`com.apple.message-payload-provider`). Choose stickers OR a messages app, but not both.

### Messages App

```json
{
  "type": "messages",
  "name": "MyMessagesApp",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "entry": "./targets/my-messages-app/index.tsx",
  "ios": {
    "targetIcon": "./assets/imessage-icon.png"
  }
}
```

Set `ios.targetIcon` to a PNG relative to the **target directory**. The plugin writes `iMessage App Icon.stickersiconset` and sets `ASSETCATALOG_COMPILER_APPICON_NAME` to `"iMessage App Icon"`. `ios.images` cannot replace this set. You do not need `stickerPacks`.

**⚠️ iOS Limitation:** You cannot have both a `messages` target and a `stickers` target in the same app. iOS allows only one message payload provider extension per app. Both types use the same extension point identifier (`com.apple.message-payload-provider`). Choose a messages app OR stickers, but not both.

### Wallet Extension

Wallet extensions enable in-app payment pass provisioning through Apple Wallet.

> **Note:** `npx expo-targets add` generates combined wallet extensions (with UI) by default. This is the recommended setup for most implementations.

**Combined configuration (with authentication UI):**

Most wallet implementations need both a Non-UI extension (background provisioning) and a UI extension (user authentication). Use the `wallet.ui` option to generate both from a single config:

```json
{
  "type": "wallet",
  "name": "MyWallet",
  "displayName": "My Wallet",
  "platforms": ["ios"],
  "ios": {
    "wallet": {
      "ui": true
    }
  }
}
```

This generates two targets:

- `MyWallet` — Non-UI extension for pass provisioning
- `MyWalletUI` — UI extension for authentication flow

For custom UI target naming:

```json
{
  "ios": {
    "wallet": {
      "ui": {
        "enabled": true,
        "name": "MyWalletAuth",
        "bundleIdentifier": "com.yourapp.wallet-auth"
      }
    }
  }
}
```

**Basic configuration (without UI):**

For rare cases where you need only background provisioning without user authentication:

```json
{
  "type": "wallet",
  "name": "MyWallet",
  "displayName": "My Wallet",
  "platforms": ["ios"]
}
```

**Requirements:**

- Apple Developer Program membership (paid)
- Pass type identifiers configured in Apple Developer portal
- Server-side pass generation and signing infrastructure
- See [Apple's Wallet documentation](https://developer.apple.com/documentation/passkit/wallet) for complete setup

**Implementation:**

Create `ios/PassProvider.swift` conforming to `PKIssuerProvisioningExtensionHandler`:

```swift
import PassKit
import UIKit

class PassProvider: PKIssuerProvisioningExtensionHandler {

    override func status() async -> PKIssuerProvisioningExtensionStatus {
        let status = PKIssuerProvisioningExtensionStatus()
        status.requiresAuthentication = true
        status.passEntriesAvailable = true
        status.remotePassEntriesAvailable = true
        return status
    }

    override func passEntries() async -> [PKIssuerProvisioningExtensionPassEntry] {
        guard let cardArt = UIImage(named: "CardArt")?.cgImage,
              let config = createAddRequestConfiguration() else {
            return []
        }

        guard let entry = PKIssuerProvisioningExtensionPaymentPassEntry(
            identifier: "your-card-identifier",
            title: "Your Card",
            art: cardArt,
            addRequestConfiguration: config
        ) else {
            return []
        }

        return [entry]
    }

    override func remotePassEntries() async -> [PKIssuerProvisioningExtensionPassEntry] {
        return await passEntries()
    }

    override func generateAddPaymentPassRequestForPassEntryWithIdentifier(
        _ identifier: String,
        configuration: PKAddPaymentPassRequestConfiguration,
        certificateChain certificates: [Data],
        nonce: Data,
        nonceSignature: Data
    ) async -> PKAddPaymentPassRequest? {
        // In production: send to server, get encrypted pass data back
        let request = PKAddPaymentPassRequest()
        // request.encryptedPassData = dataFromServer
        // request.activationData = activationDataFromServer
        return request
    }

    private func createAddRequestConfiguration() -> PKAddPaymentPassRequestConfiguration? {
        guard let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2) else {
            return nil
        }
        config.cardholderName = "Cardholder Name"
        config.primaryAccountSuffix = "1234"
        config.localizedDescription = "Your Card Description"
        config.paymentNetwork = .visa
        return config
    }
}
```

---

## Dynamic Configuration

Use `.js` or `.ts` for dynamic configs that need access to your Expo app configuration:

```typescript
// expo-target.config.ts
import type { ExpoConfig } from "expo/config";

/**
 * Dynamic config function receives the resolved Expo app config.
 * Useful for deriving values from your main app configuration.
 */
export default function (config: ExpoConfig) {
  return {
    type: "widget",
    name: "MyWidget",
    platforms: ["ios"],
    // Derive App Group from bundle identifier
    appGroup: `group.${config.ios?.bundleIdentifier || "com.example.app"}`,
    ios: {
      // Inherit deployment target from main app
      deploymentTarget: config.ios?.deploymentTarget || "14.0",
    },
  } satisfies import("expo-targets").TargetConfig;
}
```

**When to use dynamic configs:**

- Deriving `appGroup` from your app's bundle identifier
- Sharing deployment targets between app and targets
- Conditional configuration based on build variants
- Reusing values from your main app config

**The `config` parameter** contains the fully resolved Expo configuration from your `app.json` or `app.config.js`. This includes all plugin modifications. You can access:

- `config.ios?.bundleIdentifier` — Your app's bundle ID
- `config.ios?.deploymentTarget` — Your app's iOS deployment target
- `config.android?.package` — Your app's Android package name
- Any other fields from your Expo config

**Note:** Dynamic configs (`.ts` or `.js`) are processed by expo-targets during prebuild. TypeScript is supported without extra configuration. The plugin handles transpilation. Use `satisfies TargetConfig` (or a typed function return) for editor checks. `expo-target.config.json` is plain JSON. It has no types unless you add a JSON Schema. This package does not ship a schema yet.

---

## Extension Types Reference

Types with a production example and Devicewright row are marked ✅. Entitlement-gated flows can still claim `os-limit` after the live-touchpoint floor. See `examples/.devicewright/claims.ts`.

| Type                                                                                        | iOS                                      | Android             | Description                 |
| ------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------- | --------------------------- |
| `widget`                                                                                    | ✅ iOS 14+ (WidgetKit + Live Activities) | ✅ API 26+ (Glance/RemoteViews) | Home screen widgets / LA    |
| `clip`                                                                                      | ✅ iOS 14+                               | —                   | App Clips                   |
| `stickers`                                                                                  | ✅ iOS 10+                               | —                   | iMessage sticker packs      |
| `messages`                                                                                  | ✅ iOS 10+                               | —                   | iMessage apps               |
| `share`                                                                                     | ✅ iOS 8+                                | ✅ W1 dedicated Activity + RN `entry` host | Share (same TS entry)       |
| `action`                                                                                    | ✅ iOS 8+                                | ✅ W1 `PROCESS_TEXT` Activity + RN `entry` host | Action (`PROCESS_TEXT`)     |
| `wallet` / `wallet-ui`                                                                      | ✅ iOS 14+ (issuer can os-limit)         | 🔜 W4 partial       | Wallet / Google Wallet      |
| `safari`                                                                                    | ✅ iOS 15+                               | —                   | Safari web extensions       |
| `content-blocker`                                                                           | ✅ iOS 11+                               | —                   | Safari content blocker      |
| `notification-content`                                                                      | ✅ iOS 10+                               | ✅ W2 partial (RemoteViews / A12 clamp) | Rich notification UI        |
| `notification-service`                                                                      | ✅ iOS 10+                               | ✅ W2 partial (own FCM/local pre-display) | Notification processing     |
| `intent` / `intent-ui`                                                                      | ✅ iOS 12+                               | —                   | Siri intents (legacy)       |
| `app-intent`                                                                                | ✅ iOS 16+                               | 🔜 W4 partial       | App Intents / App Actions   |
| `spotlight`                                                                                 | ✅ iOS 9+                                | 🔜 W4 partial       | Spotlight / AppSearch       |
| `spotlight-delegate`                                                                        | ✅ iOS 13+                               | 🔜 W4 partial       | CoreSpotlight delegate      |
| `bg-download`                                                                               | ✅ iOS 7+                                | 🔜 W4 partial       | Background downloads        |
| `quicklook-thumbnail`                                                                       | ✅ iOS 11+                               | —                   | QuickLook thumbnails        |
| `quicklook-preview`                                                                         | ✅ iOS 8+                                | —                   | QuickLook preview           |
| `location-push`                                                                             | ✅ iOS 15+ (entitlement os-limit)        | —                   | Location push service       |
| `credentials-provider`                                                                      | ✅ iOS 12+ (Settings os-limit)           | ✅ W3a (Autofill; Settings leftover) | Credential / Autofill       |
| `account-auth`                                                                              | ✅ iOS 12.2+                             | —                   | Account authentication      |
| `authentication-services`                                                                   | ✅ iOS 13+ (SSO os-limit)                | —                   | AppSSO identity provider    |
| `device-activity-monitor`                                                                   | ✅ iOS 15+ (Family Controls os-limit)    | —                   | Device activity monitor     |
| `shield-action` / `shield-config`                                                           | ✅ iOS 15+ (Family Controls os-limit)    | —                   | Screen Time shields         |
| `matter`                                                                                    | ✅ iOS 16.1+                             | —                   | Matter extensions           |
| `watch` / `watch-widget`                                                                    | ✅ watchOS (paired sim DoD)              | ✅ Wear strong      | Watch / Wear tiles          |
| `keyboard`                                                                                  | ✅ iOS 8+                                | ✅ W3b (IME; Settings leftover) | Custom keyboard / IME       |
| `photo-editing`                                                                             | ✅ iOS 8+                                | 🔜 W4 partial       | Photo Editing / ACTION_EDIT |
| `file-provider` / `file-provider-ui`                                                        | ✅ iOS 11+                               | ✅ W3a (DocumentsProvider + UI Activity) | File Provider / Documents   |
| `broadcast-upload` / `broadcast-setup-ui`                                                   | ✅ iOS 10+                               | —                   | ReplayKit broadcast         |
| `call-directory`                                                                            | ✅ iOS 10+                               | ✅ W3b (CallScreening; role leftover) | Call Directory / Screening  |
| `message-filter`                                                                            | ✅ iOS 11+                               | 🔜 W4 partial       | SMS/MMS filter              |
| `unwanted-communication`                                                                    | ✅ iOS 12+                               | 🔜 W4 partial       | Unwanted communication UI   |
| `network-packet-tunnel`                                                                     | ✅ (NE entitlement os-limit)             | ✅ W3c (VpnService fail-closed; consent leftover) | VPN / packet tunnel         |
| `network-app-proxy` / `network-dns-proxy` / `network-filter-data`                           | ✅ (NE entitlement os-limit)             | — (use tunnel)      | Other NE types              |
| `classkit-context`                                                                          | ✅ iOS 11.4+                             | —                   | ClassKit context provider   |
| `print-service`                                                                             | ✅ iOS 14+                               | ✅ W3c (PrintService; Settings can leftover) | Print discovery             |
| `smart-card`                                                                                | ✅ iOS 10+                               | —                   | CryptoTokenKit              |
| `virtual-conference`                                                                        | ✅ iOS 15+                               | —                   | Calendar virtual conference |

**Legend:** ✅ Production with example + Devicewright · 🔜 Android wave planned · — Not applicable (Apple-only)

> **Android API-ceiling:** ~12 strong and ~8 partial groups. SSOT flags: `TYPE_CHARACTERISTICS.androidBucket` and `androidComponent`. Waves 0–3 shipped (DocumentsProvider, Autofill, IME, CallScreening, Print, VpnService). The 1.0 ceiling also includes **W4-in-1.0 partials** and **Wear strong** (`watch` and `watch-widget`). There is no separate W5 Wear wave. `message-filter` and `unwanted-communication` are in-ceiling partials (not optional). Settings and Play leftovers exist for IME, VPN, call, credentials (and print when non-automatable). ActivityKit, Dynamic Island, and StandBy remain iOS-only.

> **Combined targets:** For `wallet` and `intent` types, you can use `ios.wallet.ui` or `ios.intents.ui` to generate both the main extension and its UI companion from a single config file. The CLI generates combined wallet extensions by default. See [Wallet Extension](#wallet-extension) and [Intent UI Extension](#intent-ui-extension).

> **New types:** A type joins `ExtensionType` only with registry, scaffold, example, and Devicewright in the same PR. See [deprecations.md](./deprecations.md).

### iOS Limitations

**Message Payload Provider Extension Limit**

iOS allows only **one message payload provider extension** per app. You cannot have both a `stickers` target and a `messages` target in the same app. Both use the extension point identifier `com.apple.message-payload-provider`.

**Error if violated:**

```
Multiple message payload provider extensions found in app but only one is allowed
```

**Solution:** Choose one of:

- A `stickers` target (static sticker packs), OR
- A `messages` target (interactive iMessage app)

You cannot use both in the same app. If you need both features, consider:

- Creating separate apps for each
- Using a messages app that includes sticker functionality programmatically

**Reference:** [Apple's Messages Framework Documentation](https://developer.apple.com/documentation/messages)

### Scaffold maturity

Older docs used a 📋 “config-only” maturity label. Prefer **scaffold + example**. The plugin wires the Xcode target and `examples/` hosts ship a starting principal. New types must include an example and a Devicewright journey (see [deprecations.md](./deprecations.md)). Deepen stubs to full Apple API conformance as needed for production apps. See [limits.md](./limits.md).

**What expo-targets provides:**

- Xcode target creation with correct extension point identifier
- Info.plist configuration
- Framework linking
- Entitlements setup
- Build system integration
- Example host + Devicewright journey (per-type DoD)

**What you must deepen for production:**

- Swift/Kotlin conformance beyond the stub principal where Apple APIs require it
- Entitlement / Settings / device gates called out in [limits.md](./limits.md)

## Example: Safari Extension

Safari extensions support two modes: **React Native Web** (React components) or **Native** (manual HTML, JS, and CSS).

### Mode 1: React Native Web (Recommended)

Write your Safari extension popup with React Native components. The same `createTarget` API used for share and action extensions works here.

**What prebuild generates vs what you ship:**

| Artifact | Who writes it |
| --- | --- |
| `SafariWebExtensionHandler.swift`, `popup.html`, `manifest.json`, Resources shell | Config plugin on `npx expo prebuild` (sealed under `ios/<App>/ExpoTargetsGenerated/<Product>/`) |
| `popup.js` (your RN Web bundle) | **Automatic** — Xcode **Export Safari Web Bundle** build phase on targets with `entry`, or `npx expo-targets export-safari` |

**Minimal setup:**

```
targets/my-safari/
├── expo-target.config.json
└── src/
    └── SafariExtension.tsx
```

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
import { createTarget, useBrowserTab, useBrowserStorage } from "expo-targets";
import { View, Text, Button, StyleSheet } from "react-native";

function SafariPopup({ target }) {
  const tab = useBrowserTab();
  const [count, setCount] = useBrowserStorage("clickCount", 0);

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
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  url: { fontSize: 12, color: "#666", marginBottom: 12 },
});

export default createTarget("MySafariExt", SafariPopup);
```

Safari hooks (`useBrowserTab`, `useBrowserStorage`, `openTab`, `closePopup`, and others) are documented under [API → Safari extension runtime](./api.md#safari-extension-runtime).

**Building and deploying the popup bundle:**

1. `npx expo prebuild` creates the sealed Safari Resources shell and wires an **Export Safari Web Bundle** Xcode build phase for targets with `entry`.
2. Build from Xcode (or `npx expo run:ios`). The build phase exports your RN Web entry into sealed `Resources/popup.js` before the appex is packaged.

**CLI (optional):** export all Safari targets with `entry` without a full native build:

```bash
npx expo-targets export-safari
```

**Skip export:** set `SKIP_SAFARI_EXPORT=1` to leave the placeholder `popup.js` in place. This is useful for CI that does not need a fresh web bundle.

The export step uses `expo export:embed` for the target `entry`. It falls back to `expo export --platform web` when needed. Intermediate output lands under `ios/build/safari-resources/<Product>/`. Re-run export whenever the popup UI changes.

After you upgrade from older expo-targets that wrote `targets/*/ios/build/`, re-run prebuild once. Update any scripts that copied into the legacy `targets/*/ios/build/` path. That directory is deleted on apply when the sealed path is written.

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

> **Note:** The `SafariWebExtensionHandler.swift` file is auto-generated during prebuild. To customize native message handling, create your own at `ios/SafariWebExtensionHandler.swift`. It will not be overwritten.

> Safari web extensions use standard Web Extension APIs. See [Apple's Safari Web Extensions documentation](https://developer.apple.com/documentation/safariservices/safari_web_extensions).

**Example: Notification Service Extension**

```json
{
  "type": "notification-service",
  "name": "MyNotificationService",
  "platforms": ["ios", "android"],
  "ios": {
    "deploymentTarget": "15.0"
  },
  "android": {
    "channelId": "expo_targets_nse",
    "channelName": "Notifications",
    "mutationMarker": " [expo-targets]"
  }
}
```

Android: host-process Service and `AndroidNotification.processAndPresent` (local), plus `ExpoTargetsFcmMessagingService` for FCM data payloads. This is not a sealed NSE. Operator shade green needs `FCM_*` credentials. See [limits.md](./limits.md).

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
  "platforms": ["ios", "android"],
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
  },
  "android": {
    "channelId": "expo_targets_nce",
    "channelName": "Rich notifications",
    "category": "MY_CATEGORY"
  }
}
```

Android: `AndroidNotification.presentContent` uses RemoteViews and `DecoratedCustomViewStyle` (A12 system chrome clamp).

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

**Example: Intent Extension (Siri/Shortcuts — Legacy)**

Intent extensions handle Siri voice commands and Shortcuts actions using the legacy `INIntent` system (iOS 12+).

**Basic configuration:**

```json
{
  "type": "intent",
  "name": "MyIntent",
  "platforms": ["ios"],
  "ios": {
    "intents": {
      "intentsSupported": ["INSendMessageIntent", "INSearchForMessagesIntent"]
    }
  }
}
```

**Combined configuration (with custom UI):**

Use `intents.ui` to generate both Intent and Intent UI extensions from a single config:

```json
{
  "type": "intent",
  "name": "MyIntent",
  "platforms": ["ios"],
  "ios": {
    "intents": {
      "intentsSupported": ["INSendMessageIntent", "INSearchForMessagesIntent"],
      "ui": true
    }
  }
}
```

This generates two targets:

- `MyIntent` — Handles intent execution
- `MyIntentUI` — Provides custom UI during intent handling

For custom UI target naming:

```json
{
  "ios": {
    "intents": {
      "intentsSupported": ["INStartWorkoutIntent"],
      "ui": {
        "enabled": true,
        "name": "MyIntentDisplay",
        "bundleIdentifier": "com.yourapp.intent-display"
      }
    }
  }
}
```

**Alternative: Manual Info.plist configuration:**

```json
{
  "type": "intent",
  "name": "MyIntent",
  "platforms": ["ios"],
  "ios": {
    "infoPlist": {
      "NSExtension": {
        "NSExtensionAttributes": {
          "IntentsSupported": ["INStartWorkoutIntent", "INPauseWorkoutIntent"],
          "IntentsRestrictedWhileLocked": ["INStartWorkoutIntent"]
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
        switch intent {
        case is INSendMessageIntent:
            return self
        default:
            fatalError("Unhandled intent type: \(intent)")
        }
    }

    func handle(intent: INSendMessageIntent, completion: @escaping (INSendMessageIntentResponse) -> Void) {
        let response = INSendMessageIntentResponse(code: .success, userActivity: nil)
        completion(response)
    }

    func resolveRecipients(for intent: INSendMessageIntent, with completion: @escaping ([INSendMessageRecipientResolutionResult]) -> Void) {
        if let recipients = intent.recipients, !recipients.isEmpty {
            completion(recipients.map { INSendMessageRecipientResolutionResult.success(with: $0) })
        } else {
            completion([INSendMessageRecipientResolutionResult.needsValue()])
        }
    }
}
```

> **Important:** The main app must have the Siri capability enabled in entitlements. Users must also grant Siri permission.

### Intent UI Extension

For standalone intent UI extension (custom Siri response UI):

```json
{
  "type": "intent-ui",
  "name": "MyIntentUI",
  "platforms": ["ios"],
  "ios": {
    "intents": {
      "intentsSupported": ["INSendMessageIntent"]
    }
  }
}
```

Create `ios/IntentViewController.swift`:

```swift
import IntentsUI

class IntentViewController: UIViewController, INUIHostedViewControlling {
    func configureView(
        for parameters: Set<INParameter>,
        of interaction: INInteraction,
        interactiveBehavior: INUIInteractiveBehavior,
        context: INUIHostedViewContext,
        completion: @escaping (Bool, Set<INParameter>, CGSize) -> Void
    ) {
        // Configure your custom UI based on the intent
        let desiredSize = CGSize(width: view.bounds.width, height: 120)
        completion(true, parameters, desiredSize)
    }
}
```

> **Tip:** Use the combined `intents.ui: true` config instead of separate `intent` and `intent-ui` targets unless you need different configurations for each.

### App Intent Extension (iOS 16+)

App Intents are the modern replacement for legacy INIntent-based intents. They provide better Shortcuts integration, Focus Filters, and Spotlight suggestions.

**Host vs empty appex:** Shortcuts-listable intents and the `AppShortcutsProvider` must live in the **main app** (CNG into `ios/<App>/ExpoTargetsGenerated/`). The `type: "app-intent"` target still emits an **empty** `AppIntentsExtension` appex. That keeps the `appintents-extension` pluginkit proof and room for future out-of-process intents. Do **not** duplicate Shortcuts intents in the appex (Sim often shows “Unable to run”).

Declare host intents and shortcuts in config. Put `perform` logic in a user-owned hook under `targets/<name>/ios/` (never overwritten on prebuild; main-app membership):

```json
{
  "type": "app-intent",
  "name": "MyAppIntent",
  "platforms": ["ios"],
  "ios": {
    "appIntents": [
      {
        "className": "ETHostGreetIntent",
        "title": "ET Greet",
        "description": "Returns a greeting",
        "openAppWhenRun": true,
        "performHook": "ETHostGreetIntentPerform"
      }
    ],
    "appShortcuts": [
      {
        "intent": "ETHostGreetIntent",
        "phrases": ["Say hello in \\(.applicationName)"],
        "shortTitle": "ET Greet",
        "systemImageName": "hand.wave"
      }
    ]
  }
}
```

```swift
// targets/my-app-intent/ios/ETHostGreetIntentPerform.swift  (user-owned)
enum ETHostGreetIntentPerform {
  static func perform() async throws {
    // your work — App Group writes, etc.
  }
}
```

```swift
// targets/my-app-intent/ios/AppIntentExtension.swift  (empty appex)
import AppIntents
@main
struct MyAppIntentExtension: AppIntentsExtension {}
```

**Filesystem zones:** host shells and provider go flat under `ios/*/ExpoTargetsGenerated/` (gitignored). Per-target sealed build goes under `ExpoTargetsGenerated/<Product>/`. Perform hooks and empty `@main` extension go under `targets/*/ios/` (committed). See [widgets.md](./widgets.md) for the same zone rule on Live Activities.

**When to use App Intents vs legacy Intent:**

| Feature                 | App Intents (iOS 16+) | Legacy Intent (iOS 12+) |
| ----------------------- | --------------------- | ----------------------- |
| Shortcuts support       | ✅ Native             | ✅ Requires donation    |
| Focus Filters           | ✅                    | ❌                      |
| Spotlight suggestions   | ✅ Built-in           | ❌                      |
| Siri voice              | ✅                    | ✅                      |
| Widget configuration    | ✅                    | ❌                      |
| Backwards compatibility | iOS 16+ only          | iOS 12+                 |

> **Recommendation:** Use App Intents for new projects that target iOS 16+. Use legacy Intent extensions for broader device support.

**Required protocols by type:**

| Type                   | Required Protocol/Class                                                                          | Documentation                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `wallet`               | `PKIssuerProvisioningExtensionHandler` + `PKIssuerProvisioningExtensionAuthorizationProviding`\* | [Apple Docs](https://developer.apple.com/documentation/passkit/pkissuerprovisioningextensionhandler)       |
| `safari`               | `NSExtensionRequestHandling`                                                                     | [Apple Docs](https://developer.apple.com/documentation/safariservices/safari_web_extensions)               |
| `notification-content` | `UNNotificationContentExtension`                                                                 | [Apple Docs](https://developer.apple.com/documentation/usernotificationsui/unnotificationcontentextension) |
| `notification-service` | `UNNotificationServiceExtension`                                                                 | [Apple Docs](https://developer.apple.com/documentation/usernotifications/unnotificationserviceextension)   |
| `intent`               | `INExtension` + `INUIHostedViewControlling`\*                                                    | [Apple Docs](https://developer.apple.com/documentation/sirikit/inextension)                                |
| `app-intent`           | `AppIntentsExtension`                                                                            | [Apple Docs](https://developer.apple.com/documentation/appintents)                                         |

\*When using the `ui: true` option for combined targets

**Tips:**

- Check the generated Xcode project to see what files are expected
- Refer to Apple's documentation for each extension type's requirements
- Start with a working example from Apple's sample code
- Use the generated Info.plist as a reference for required keys

---

## Recommended Deployment Targets

| Type         | Recommended | Minimum  |
| ------------ | ----------- | -------- |
| `widget`     | `"14.0"`    | iOS 14.0 |
| `clip`       | `"14.0"`    | iOS 14.0 |
| `stickers`   | `"10.0"`    | iOS 10.0 |
| `messages`   | `"14.0"`    | iOS 10.0 |
| `share`      | `"13.0"`    | iOS 8.0  |
| `action`     | `"13.0"`    | iOS 8.0  |
| `wallet`     | `"14.0"`    | iOS 14.0 |
| `intent`     | `"14.0"`    | iOS 12.0 |
| `app-intent` | `"16.0"`    | iOS 16.0 |

---

## Troubleshooting

### Config not detected?

**Symptoms:** Target doesn't appear after prebuild

**Solutions:**

- Name the file `expo-target.config.json` (or `.js` or `.ts`)
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

All three locations must show the identical App Group ID.
