# Getting Started with expo-targets

This comprehensive guide walks you through creating your first iOS widget with expo-targets, from installation to deployment.

## Prerequisites

- **Expo SDK 50+** (tested with Expo 52+)
- **iOS development environment**:
  - macOS with Xcode 14+
  - Xcode Command Line Tools installed
- **Device/Simulator**: iOS 14+ (iOS 18+ recommended for latest features)
- **Package manager**: Bun (recommended) or npm

## Installation

```bash
bun add expo-targets
# or npm install expo-targets
```

The package includes:

- TypeScript API (`defineTarget`, `TargetStorage`)
- Expo config plugin (automatic Xcode project setup)
- Metro wrapper (for React Native extensions)
- Native Swift module (data sharing & widget refresh)
- CLI tool (`create-target`)

## Step 1: Configure App Groups

App Groups enable data sharing between your main app and extensions via shared `UserDefaults`.

### 1.1 Add App Groups to app.json

```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "version": "1.0.0",
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

**Important**:

- App Group ID should start with `group.` followed by your reversed domain
- Must match exactly in both app.json and your target definitions
- Extensions automatically inherit this App Group

### 1.2 Verify Apple Developer Configuration

For physical devices, ensure your App Group is registered in Apple Developer Portal:

1. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
2. Select your App ID
3. Enable **App Groups** capability
4. Create/select your App Group (e.g., `group.com.yourcompany.myapp`)

## Step 2: Create a Widget Target

### Option A: Use the CLI (Recommended)

```bash
npx create-target
```

Interactive prompts:

- **Type**: Widget
- **Name**: hello-widget
- **Platforms**: iOS
- **React Native**: No (widgets use SwiftUI)

### Option B: Manual Creation

Create the directory structure:

```bash
mkdir -p targets/hello-widget/ios
```

Create `targets/hello-widget/index.ts`:

```typescript
import { defineTarget } from 'expo-targets';

export const HelloWidget = defineTarget({
  name: 'hello-widget',
  appGroup: 'group.com.yourcompany.myapp',
  type: 'widget',
  displayName: 'Hello Widget',
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      colors: {
        $accent: '#007AFF',
        $background: { light: '#F2F2F7', dark: '#1C1C1E' },
        $textPrimary: { light: '#000000', dark: '#FFFFFF' },
      },
    },
  },
});

// Export type for type-safe data operations
export type HelloWidgetData = {
  message: string;
  timestamp: number;
  count?: number;
};
```

**Configuration explained:**

- `name`: Target identifier (must match directory name)
- `appGroup`: Must match the App Group from app.json
- `type`: Extension type ('widget', 'clip', 'imessage', etc.)
- `deploymentTarget`: Minimum iOS version (14.0 for widgets)
- `colors`: Named colors for SwiftUI ($ prefix optional)

## Step 3: Implement the Widget

Create `targets/hello-widget/ios/Widget.swift`:

```swift
import WidgetKit
import SwiftUI

// MARK: - Timeline Entry
struct SimpleEntry: TimelineEntry {
    let date: Date
    let message: String
    let count: Int
}

// MARK: - Timeline Provider
struct Provider: TimelineProvider {
    // App Group for shared data
    private let appGroup = "group.com.yourcompany.myapp"

    // Placeholder shown during loading
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), message: "Loading...", count: 0)
    }

    // Quick snapshot for widget gallery
    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = getEntry()
        completion(entry)
    }

    // Timeline with entry data and update schedule
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = getEntry()

        // Update widget every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    // Read data from shared App Group
    private func getEntry() -> SimpleEntry {
        let defaults = UserDefaults(suiteName: appGroup)
        let message = defaults?.string(forKey: "message") ?? "No message yet"
        let count = defaults?.integer(forKey: "count") ?? 0

        return SimpleEntry(date: Date(), message: message, count: count)
    }
}

// MARK: - Widget View
struct HelloWidgetView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            // Background color from Assets.xcassets
            Color("$background")

            VStack(spacing: 12) {
                // Icon
                Image(systemName: "star.fill")
                    .font(.system(size: family == .systemSmall ? 32 : 48))
                    .foregroundColor(Color("$accent"))

                // Message text
                Text(entry.message)
                    .font(family == .systemSmall ? .body : .title3)
                    .fontWeight(.semibold)
                    .foregroundColor(Color("$textPrimary"))
                    .multilineTextAlignment(.center)
                    .lineLimit(family == .systemSmall ? 2 : 3)

                // Count badge
                if entry.count > 0 {
                    Text("\(entry.count)")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color("$accent").opacity(0.2))
                        .foregroundColor(Color("$accent"))
                        .cornerRadius(8)
                }

                // Last updated timestamp
                if family != .systemSmall {
                    Text(entry.date, style: .time)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
        }
    }
}

// MARK: - Widget Configuration
@main
struct HelloWidget: Widget {
    let kind: String = "hello-widget"  // Must match target name

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            HelloWidgetView(entry: entry)
        }
        .configurationDisplayName("Hello Widget")
        .description("Displays messages from your app")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Preview
struct HelloWidget_Previews: PreviewProvider {
    static var previews: some View {
        HelloWidgetView(entry: SimpleEntry(
            date: Date(),
            message: "Preview Message",
            count: 42
        ))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
```

**Widget architecture explained:**

- **TimelineProvider**: Fetches data and determines update schedule
- **TimelineEntry**: Data model for widget state at a specific time
- **View**: SwiftUI view that renders the widget
- **Widget**: Configuration defining display name, description, supported sizes
- **App Group**: Shared storage accessed via `UserDefaults(suiteName:)`

## Step 4: Use Widget in Your App

### 4.1 Create Barrel Export (Recommended)

Create `targets/index.ts` to export all your targets:

```typescript
export { HelloWidget } from './hello-widget';
export type { HelloWidgetData } from './hello-widget';
```

### 4.2 Implement Widget Updates

In your main app (`App.tsx`):

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { HelloWidget } from './targets';
import type { HelloWidgetData } from './targets';

export default function App() {
  const [message, setMessage] = useState('');
  const [count, setCount] = useState(0);

  // Simple key-value update
  const updateWidgetSimple = () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    HelloWidget.set('message', message);
    HelloWidget.set('count', count);
    HelloWidget.refresh();

    Alert.alert('Success', 'Widget updated!');
    setMessage('');
  };

  // Type-safe data object update
  const updateWidgetTypeSafe = () => {
    const data: HelloWidgetData = {
      message: message || 'Hello Widget!',
      timestamp: Date.now(),
      count: count,
    };

    HelloWidget.setData(data);
    HelloWidget.refresh();

    Alert.alert('Success', 'Widget updated with type-safe data!');
  };

  // Read current widget data
  const readWidgetData = () => {
    const msg = HelloWidget.get('message');
    const data = HelloWidget.getData<HelloWidgetData>();

    Alert.alert('Widget Data',
      `Message: ${msg}\nFull data: ${JSON.stringify(data, null, 2)}`
    );
  };

  // Clear widget data
  const clearWidget = () => {
    HelloWidget.remove('message');
    HelloWidget.remove('count');
    HelloWidget.refresh();

    Alert.alert('Success', 'Widget data cleared!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello Widget Demo</Text>
      <Text style={styles.subtitle}>Update your widget from the app</Text>

      {/* Message input */}
      <View style={styles.section}>
        <Text style={styles.label}>Message:</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter message for widget"
          value={message}
          onChangeText={setMessage}
        />
      </View>

      {/* Counter */}
      <View style={styles.section}>
        <Text style={styles.label}>Count: {count}</Text>
        <View style={styles.row}>
          <Button title="-" onPress={() => setCount(Math.max(0, count - 1))} />
          <Button title="+" onPress={() => setCount(count + 1)} />
        </View>
      </View>

      {/* Update buttons */}
      <View style={styles.section}>
        <Button title="Update Widget (Simple)" onPress={updateWidgetSimple} />
        <View style={styles.spacer} />
        <Button
          title="Update Widget (Type-Safe)"
          onPress={updateWidgetTypeSafe}
          color="#007AFF"
        />
      </View>

      {/* Utility buttons */}
      <View style={styles.section}>
        <Button title="Read Widget Data" onPress={readWidgetData} color="#34C759" />
        <View style={styles.spacer} />
        <Button title="Clear Widget" onPress={clearWidget} color="#FF3B30" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  spacer: {
    height: 8,
  },
});
```

### 4.3 API Methods Explained

```typescript
// Store individual values
HelloWidget.set(key: string, value: string | number | object | array)
HelloWidget.get(key: string): string | null
HelloWidget.remove(key: string): void

// Type-safe data object
HelloWidget.setData<HelloWidgetData>(data: HelloWidgetData): void
HelloWidget.getData<HelloWidgetData>(): HelloWidgetData | null

// Refresh widget UI
HelloWidget.refresh(): void  // Refreshes this specific widget

// Or refresh all targets
import { refreshAllTargets } from 'expo-targets';
refreshAllTargets();  // Refreshes all widgets/controls
```

## Step 5: Build and Deploy

### 5.1 Generate Native Project

Run prebuild to create the Xcode project with your widget target:

```bash
npx expo prebuild -p ios --clean
```

This command:

1. Scans `targets/*/index.ts` for `defineTarget()` calls
2. Parses configuration using Babel AST
3. Creates native Xcode targets
4. Links Swift files from `targets/*/ios/`
5. Configures build settings, frameworks, entitlements
6. Generates color and image assets

**Expected output:**

```
[expo-targets] Found 1 target(s)
[expo-targets] Processing hello-widget: type=widget
[expo-targets] Adding Xcode target: Hello Widget (widget)
[expo-targets] Created native target: HelloWidget
[expo-targets] Found 1 Swift file(s)
[expo-targets] Successfully configured Hello Widget target
```

### 5.2 Build in Xcode

Open the generated workspace:

```bash
open ios/YourApp.xcworkspace
```

In Xcode:

1. Select your main app scheme
2. Choose a device or simulator (iOS 14+)
3. Click **Run** (Cmd+R)

**Verify the widget target:**

- Check **Project Navigator** → See `HelloWidget` target
- Check **HelloWidget** folder → Contains `Widget.swift`, `Info.plist`
- Check **Build Phases** → Sources includes `Widget.swift`
- Check **General** → Frameworks includes `WidgetKit.framework`, `SwiftUI.framework`

### 5.3 Add Widget to Home Screen

Once the app is running:

1. **Go to home screen**
2. **Long press** on empty space
3. **Tap "+"** button (top left)
4. **Search** for "Hello Widget"
5. **Select widget size** (Small, Medium, or Large)
6. **Tap "Add Widget"**
7. **Done**

### 5.4 Test Widget Updates

1. **Open your app**
2. **Enter a message** and count
3. **Tap "Update Widget (Simple)"**
4. **Go to home screen** → Widget updates immediately
5. **Try different values** → Widget reflects changes

**Debugging widget updates:**

- Check Console.app for widget logs
- Enable "Show File Path" in widget configuration
- Use Xcode debugger: **Debug** → **Attach to Process** → Select widget extension

## Verification Checklist

✅ App builds successfully in Xcode
✅ Widget appears in widget gallery
✅ Widget displays on home screen
✅ Widget updates when app calls `refresh()`
✅ Colors from config appear correctly
✅ Data persists across app restarts

## Next Steps

### Advanced Features

- **Multiple widget sizes**: Create size-specific views (`SmallWidgetView`, `MediumWidgetView`, `LargeWidgetView`)
- **Widget configuration**: Add `IntentConfiguration` for user-customizable widgets
- **Network requests**: Fetch data in timeline provider
- **Complex data**: Use Codable structs with JSON encoding
- **Localization**: Add localized strings
- **App Intents**: Add interactive buttons (iOS 17+)

### Additional Resources

- [API Reference](./api-reference.md) - Complete API documentation
- [Config Reference](./config-reference.md) - All configuration options
- [TypeScript Config Guide](./typescript-config-guide.md) - Advanced TypeScript patterns
- [Example Apps](../apps/) - Complete working examples

## Troubleshooting

### Widget not appearing in widget gallery?

**Causes:**

- Widget target not created in Xcode
- Info.plist missing or malformed
- Bundle identifier conflict

**Solutions:**

1. Run `npx expo prebuild -p ios --clean` again
2. Open Xcode → Check **Project Navigator** for widget target
3. Verify `targets/hello-widget/ios/Info.plist` exists
4. Check **Info.plist** contains `NSExtension` configuration
5. Clean build folder: **Product** → **Clean Build Folder** (Cmd+Shift+K)

### Widget not updating with new data?

**Causes:**

- App Group mismatch between app.json and defineTarget
- Widget not calling refresh()
- Timeline policy preventing updates
- Simulator caching issues

**Solutions:**

1. Verify App Group IDs match **exactly**:

   ```typescript
   // app.json
   "entitlements": {
     "com.apple.security.application-groups": ["group.com.yourcompany.myapp"]
   }

   // targets/hello-widget/index.ts
   appGroup: 'group.com.yourcompany.myapp'

   // targets/hello-widget/ios/Widget.swift
   UserDefaults(suiteName: "group.com.yourcompany.myapp")
   ```

2. Confirm `HelloWidget.refresh()` is called after setting data
3. Test on **physical device** (simulators have widget caching issues)
4. Check timeline update policy in Swift code
5. Force widget reload: Remove widget from home screen and re-add

### Build errors in Xcode?

**Common errors:**

**"No such module 'WidgetKit'":**

- Solution: Check deployment target is iOS 14.0+
- Solution: Verify `WidgetKit.framework` is linked in **Build Phases**

**"Cannot find type 'TimelineProvider' in scope":**

- Solution: Add `import WidgetKit` to Swift file
- Solution: Check Swift version in build settings (5.0+)

**"Undefined symbol: \_$s10WidgetKit...":**

- Solution: Clean build folder (Cmd+Shift+K)
- Solution: Delete `ios/` and run `expo prebuild` again

**Generic build failures:**

1. **Clean build folder**: Product → Clean Build Folder (Cmd+Shift+K)
2. **Delete derived data**: Xcode → Preferences → Locations → Derived Data → Delete
3. **Re-prebuild**: `rm -rf ios/ && npx expo prebuild -p ios --clean`
4. **Check logs**: View full build logs in **Report Navigator** (Cmd+9)

### TypeScript errors with defineTarget?

**"Cannot find module 'expo-targets'":**

1. Install package: `bun add expo-targets`
2. Clear Metro cache: `npx expo start --clear`
3. Restart TypeScript server in editor

**"Type 'HelloWidgetData' is not assignable":**

1. Verify type export: `export type HelloWidgetData = {...}`
2. Check optional vs required fields
3. Restart TypeScript server

### Widget shows "Loading..." forever?

**Causes:**

- Timeline provider error
- UserDefaults returning nil
- App Group not properly configured

**Solutions:**

1. Check Xcode console for errors
2. Add debug logging to timeline provider
3. Verify App Group entitlements are synced
4. Test with hardcoded data first

## Performance Tips

- **Minimize timeline updates**: Update every 15-30 minutes, not constantly
- **Optimize asset sizes**: Use properly sized images for each widget family
- **Lazy loading**: Don't load unnecessary data in widget provider
- **Background refresh**: Use `BGAppRefreshTask` for data fetching
- **Efficient Swift code**: Avoid heavy computations in widget views

## Going to Production

1. **Test thoroughly** on multiple devices and iOS versions
2. **Handle errors gracefully** in timeline provider
3. **Add analytics** to track widget usage
4. **Monitor crashes** in production
5. **Optimize update frequency** based on user behavior
6. **Test App Store submission** with widget included
7. **Document widget features** for users

Congratulations! You've successfully created and deployed an iOS widget with expo-targets. 🎉
