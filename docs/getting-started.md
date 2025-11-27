# Getting Started

Build your first iOS widget in 5 minutes.

## Prerequisites

- macOS with Xcode 14+
- Expo SDK 50+ (tested with 52+)
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

> **⚠️ App Groups are Critical**
>
> App Groups enable data sharing between your app and widgets. If the IDs don't match exactly, **data sharing fails silently** — your widget will show default values instead of app data.
>
> - The ID must start with `group.`
> - Convention: use `group.{your.bundle.identifier}` (e.g., `group.com.yourcompany.myapp`)
> - **Must match exactly** in: `app.json`, target config, and Swift code

## Step 3: Create a Widget

Run the CLI:

```bash
npx create-target
```

Choose:

- **Type:** Widget
- **Name:** hello-widget

This creates:

```
targets/hello-widget/
├── expo-target.config.json   # Configuration
├── index.ts                  # Pre-configured target instance
└── ios/
    └── Widget.swift          # SwiftUI code
```

### Generated Files Explained

**`expo-target.config.json`** — Tells expo-targets how to build this extension:

```json
{
  "type": "widget",
  "name": "HelloWidget",
  "displayName": "Hello Widget",
  "platforms": ["ios"],
  "appGroup": "group.com.yourcompany.yourapp",
  "ios": {
    "deploymentTarget": "14.0"
  }
}
```

**`index.ts`** — Pre-configured target instance you can import directly:

```typescript
import { createTarget } from 'expo-targets';

export const helloWidget = createTarget('HelloWidget');
```

**`ios/Widget.swift`** — The complete SwiftUI widget (see [full code below](#complete-widget-swift-code)).

### ⚠️ After Running create-target

The CLI generates placeholder App Group IDs. **You must update them to match your `app.json`:**

1. Open `targets/hello-widget/expo-target.config.json`
2. Change `"appGroup": "group.com.yourcompany.yourapp"` to match your `app.json`
3. Open `targets/hello-widget/ios/Widget.swift`
4. Find `let appGroup = "YOUR_APP_GROUP_HERE"` and update it

### Naming Conventions

All these names must match exactly (except the folder name, which is just organizational):

| Location            | Format              | Example                            | Notes                                 |
| ------------------- | ------------------- | ---------------------------------- | ------------------------------------- |
| Target folder       | kebab-case          | `targets/hello-widget/`            | Just for organization                 |
| Config `name` field | PascalCase          | `"name": "HelloWidget"`            | **The canonical identifier**          |
| Swift `kind`        | Same as config name | `let kind: String = "HelloWidget"` | Must match config `name` exactly      |
| JavaScript usage    | Same as config name | `createTarget('HelloWidget')`      | Must match config `name` exactly      |
| `index.ts` export   | camelCase           | `export const helloWidget = ...`   | Just for convenience, can be anything |

**Critical:** The config `name` field, Swift `kind`, and `createTarget()` argument must all match exactly. If they don't, data sharing will fail silently.

> **Note:** For React Native extensions (share, action, clip, messages), pass your component as the second argument to `createTarget()`. See [React Native Extensions](./react-native-extensions.md#naming-conventions) for details.

## Step 4: Build & Run

> **What does `prebuild` do?**
>
> `npx expo prebuild` generates the native `ios/` and `android/` folders from your Expo config. Run this whenever you:
>
> - Add or modify targets
> - Change `app.json` configuration
> - Update target configuration files

> **Note:** This requires `npx expo run:ios` (development builds). Does not work with Expo Go.

```bash
npx expo prebuild
npx expo run:ios
```

## Step 5: Add the Widget to Home Screen

1. Long press on the home screen
2. Tap the **+** button
3. Search for your app name
4. Select a widget size and tap **Add Widget**

🎉 **Your widget is now on the home screen!**

---

## Update Your Widget from React Native

Open `App.tsx` and add:

```typescript
import React from 'react';
import { View, Button, StyleSheet } from 'react-native';

// Option A: Import the generated target instance (recommended)
import { helloWidget } from './targets/hello-widget';

// Option B: Create your own instance
// import { createTarget } from 'expo-targets';
// const helloWidget = createTarget('HelloWidget');

function App() {
  const updateWidget = () => {
    helloWidget.setData({
      message: 'Hello from React Native!',
    });
    helloWidget.refresh();
  };

  return (
    <View style={styles.container}>
      <Button title="Update Widget" onPress={updateWidget} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
});

export default App;
```

Tap the button, and your widget updates instantly.

> **Which import style should I use?**
>
> - **Import from `./targets/hello-widget`** — Recommended. The generated `index.ts` is pre-configured with the correct name and can include typed helpers.
> - **Create with `createTarget()`** — Use when you need the target instance outside the targets folder, or want more control.
>
> Both approaches work identically — they create the same underlying target instance.

---

## Complete Widget Swift Code

Here's the full `Widget.swift` generated by `create-target`. This is a complete, working SwiftUI widget:

```swift
import WidgetKit
import SwiftUI

// Data structure for timeline entries
struct SimpleEntry: TimelineEntry {
    let date: Date
    let message: String
}

// Provides timeline data to the widget
struct Provider: TimelineProvider {
    // ⚠️ IMPORTANT: This must match your app.json App Group ID exactly
    let appGroup = "group.com.yourcompany.myapp"

    // Placeholder shown while widget loads
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), message: "Loading...")
    }

    // Snapshot for widget gallery preview
    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), message: loadMessage())
        completion(entry)
    }

    // Provides timeline of entries for the widget
    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        let entry = SimpleEntry(date: Date(), message: loadMessage())
        // Refresh every 15 minutes (iOS may adjust this)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    // Load data from shared App Group storage
    private func loadMessage() -> String {
        let defaults = UserDefaults(suiteName: appGroup)
        return defaults?.string(forKey: "message") ?? "No message yet"
    }
}

// The widget's SwiftUI view
struct WidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "star.fill")
                .font(.system(size: 24))
                .foregroundColor(.blue)

            Text(entry.message)
                .font(.body)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

// Widget configuration
@main
struct HelloWidget: Widget {
    // ⚠️ IMPORTANT: This must match the "name" field in expo-target.config.json
    let kind: String = "HelloWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WidgetView(entry: entry)
        }
        .configurationDisplayName("Hello Widget")
        .description("A simple message widget")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```

### Customizing Your Widget

**Change the appearance:**

- Edit the `WidgetView` struct to modify layout, colors, and fonts
- Use SwiftUI views like `Text`, `Image`, `VStack`, `HStack`, `ZStack`
- Reference colors defined in your config: `Color("AccentColor")`

**Change supported sizes:**

- Modify `.supportedFamilies([...])` to include `.systemSmall`, `.systemMedium`, `.systemLarge`

**Read different data:**

- Add more keys in `loadMessage()` using `defaults?.string(forKey: "yourKey")`
- For complex data, use `defaults?.data(forKey: "key")` and decode JSON

**Add more data fields:**

- Add properties to `SimpleEntry`
- Load them in `Provider`
- Display them in `WidgetView`

---

## Troubleshooting

### Widget doesn't appear in picker?

**Error:** Widget not showing when you tap + on home screen

**Solutions:**

1. Run `npx expo prebuild` (regenerates native projects)
2. Check Xcode that the target exists: Open `.xcworkspace` → Project Navigator should show your widget target
3. Clean build folder: **Product → Clean Build Folder** (⇧⌘K)
4. Delete the app from simulator and rebuild

### Widget shows "No message yet" after calling setData?

**Error:** Data isn't reaching the widget

**Checklist — App Group IDs must match exactly in all three places:**

```
app.json:                    "group.com.yourcompany.myapp"
expo-target.config.json:     "group.com.yourcompany.myapp"
Widget.swift (appGroup):     "group.com.yourcompany.myapp"
```

Also verify:

- You're calling `widget.refresh()` after `setData()`
- Test on a physical device (simulators cache aggressively)
- The `kind` in Swift matches the `name` in config

### Build errors?

**Error:** `No such module 'WidgetKit'`

**Solution:** Your deployment target may be too low. Widgets require iOS 14+:

```json
{
  "ios": {
    "deploymentTarget": "14.0"
  }
}
```

**Error:** `Multiple commands produce...` or signing errors

**Solution:**

1. Delete `ios/` folder completely
2. Re-run `npx expo prebuild`
3. If still failing, open Xcode and check **Signing & Capabilities** for each target

### Common Error Messages

| Error                                           | Cause                | Fix                                              |
| ----------------------------------------------- | -------------------- | ------------------------------------------------ |
| `Target 'X' not found`                          | Target name mismatch | Ensure `createTarget('X')` matches config `name` |
| `UserDefaults suiteName is nil`                 | Invalid App Group ID | Check App Group starts with `group.`             |
| `Widget extension has conflicting provisioning` | Signing mismatch     | Re-run prebuild or check Xcode signing settings  |

---

## Next Steps

- **[Configuration Reference](./configuration.md)** — All configuration options
- **[API Reference](./api.md)** — Complete JavaScript/TypeScript API
- **[React Native Extensions](./react-native-extensions.md)** — Build share/action extensions with React Native
- **[Examples](../apps/)** — Working example apps for every extension type

### Try Other Extension Types

```bash
npx create-target
```

Choose from:

- **App Clip** — Lightweight app experiences
- **Share Extension** — Accept shared content from other apps
- **iMessage Stickers** — Custom sticker packs
- **Action Extension** — Process content in place

---

## Workflows: Managed vs Bare

### Expo Managed (Recommended)

Your `ios/` folder is generated by Expo and not committed to git.

```bash
npx expo prebuild   # Generates ios/ folder
npx expo run:ios    # Builds and runs
```

**Use this if:**

- Starting a new project
- Your `ios/` folder is in `.gitignore`
- You run `expo prebuild` regularly
- You don't have custom native code modifications

### Bare React Native

Your `ios/` folder is committed to git and you maintain it manually.

```bash
npx expo-targets sync       # Adds targets to existing ios/
cd ios && pod install
npx react-native run-ios    # Or: npx expo run:ios
```

**Use this if:**

- You have an existing React Native project
- Your `ios/` folder has custom native modifications
- You can't use `expo prebuild` (it would overwrite your changes)

> **Tip:** See [bare-rn-widgets](../apps/bare-rn-widgets/) and [bare-rn-share](../apps/bare-rn-share/) for complete examples.
