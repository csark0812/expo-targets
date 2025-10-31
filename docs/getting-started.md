# Getting Started with expo-targets

This guide walks you through creating your first iOS widget with expo-targets, from installation to deployment.

## Prerequisites

- **Expo SDK 50+** (tested with Expo 52+)
- **iOS development environment**:
  - macOS with Xcode 14+
  - Xcode Command Line Tools installed
- **Device/Simulator**: iOS 14+ for widgets
- **Package manager**: Bun or npm

## Installation

```bash
bun add expo-targets
# or npm install expo-targets
```

## Step 1: Configure App Groups

App Groups enable data sharing between your main app and extensions via shared UserDefaults.

### Add to app.json

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

- App Group ID must start with `group.`
- Must match exactly in config and Swift code
- Extensions automatically inherit this App Group

### Configure Apple Developer Portal

For physical devices, register your App Group:

1. Go to [Apple Developer](https://developer.apple.com/account/resources/identifiers/list)
2. Select your App ID
3. Enable **App Groups** capability
4. Create/select your App Group (e.g., `group.com.yourcompany.myapp`)

## Step 2: Create a Widget Target

### Option A: Use CLI (Recommended)

```bash
npx create-target
```

Prompts:

- **Type**: Widget
- **Name**: hello-widget
- **Platforms**: iOS

### Option B: Manual Creation

Create directory structure:

```bash
mkdir -p targets/hello-widget/ios
```

Create `targets/hello-widget/expo-target.config.json`:

```json
{
  "type": "widget",
  "name": "HelloWidget",
  "displayName": "Hello Widget",
  "platforms": ["ios"],
  "appGroup": "group.com.yourcompany.myapp",
  "ios": {
    "deploymentTarget": "14.0",
    "colors": {
      "AccentColor": { "light": "#007AFF", "dark": "#0A84FF" },
      "BackgroundColor": { "light": "#F2F2F7", "dark": "#1C1C1E" },
      "TextPrimary": { "light": "#000000", "dark": "#FFFFFF" }
    }
  }
}
```

**Config explained:**

- `name`: Target identifier (PascalCase, used in Swift)
- `appGroup`: Must match app.json
- `type`: Extension type
- `deploymentTarget`: Minimum iOS version
- `colors`: Named colors for SwiftUI

## Step 3: Implement the Widget

Create `targets/hello-widget/ios/Widget.swift`:

```swift
import WidgetKit
import SwiftUI

struct SimpleEntry: TimelineEntry {
    let date: Date
    let message: String
    let count: Int
}

struct Provider: TimelineProvider {
    private let appGroup = "group.com.yourcompany.myapp"

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), message: "Loading...", count: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = getEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = getEntry()

        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func getEntry() -> SimpleEntry {
        let defaults = UserDefaults(suiteName: appGroup)
        let message = defaults?.string(forKey: "message") ?? "No message yet"
        let count = defaults?.integer(forKey: "count") ?? 0

        return SimpleEntry(date: Date(), message: message, count: count)
    }
}

struct HelloWidgetView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            Color("BackgroundColor")

            VStack(spacing: 12) {
                Image(systemName: "star.fill")
                    .font(.system(size: family == .systemSmall ? 32 : 48))
                    .foregroundColor(Color("AccentColor"))

                Text(entry.message)
                    .font(family == .systemSmall ? .body : .title3)
                    .fontWeight(.semibold)
                    .foregroundColor(Color("TextPrimary"))
                    .multilineTextAlignment(.center)
                    .lineLimit(family == .systemSmall ? 2 : 3)

                if entry.count > 0 {
                    Text("\(entry.count)")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color("AccentColor").opacity(0.2))
                        .foregroundColor(Color("AccentColor"))
                        .cornerRadius(8)
                }

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

@main
struct HelloWidget: Widget {
    let kind: String = "HelloWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            HelloWidgetView(entry: entry)
        }
        .configurationDisplayName("Hello Widget")
        .description("Displays messages from your app")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

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

## Step 4: Create Runtime API

Create `targets/hello-widget/index.ts`:

```typescript
import { createTarget } from 'expo-targets';

export const helloWidget = createTarget('HelloWidget');

export interface HelloWidgetData {
  message: string;
  count?: number;
}
```

## Step 5: Use in Your App

In your main app (`App.tsx`):

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { helloWidget } from './targets/hello-widget';
import type { HelloWidgetData } from './targets/hello-widget';

export default function App() {
  const [message, setMessage] = useState('');
  const [count, setCount] = useState(0);

  const updateWidget = () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    // Update widget data
    helloWidget.set('message', message);
    helloWidget.set('count', count);
    helloWidget.refresh();

    Alert.alert('Success', 'Widget updated!');
    setMessage('');
  };

  const updateWidgetTypeSafe = () => {
    const data: HelloWidgetData = {
      message: message || 'Hello Widget!',
      count: count,
    };

    helloWidget.setData(data);
    helloWidget.refresh();

    Alert.alert('Success', 'Widget updated!');
  };

  const readWidgetData = () => {
    const msg = helloWidget.get('message');
    const data = helloWidget.getData<HelloWidgetData>();

    Alert.alert('Widget Data',
      `Message: ${msg}\nFull data: ${JSON.stringify(data, null, 2)}`
    );
  };

  const clearWidget = () => {
    helloWidget.clear();
    helloWidget.refresh();
    Alert.alert('Success', 'Widget cleared!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello Widget Demo</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Message:</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter message for widget"
          value={message}
          onChangeText={setMessage}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Count: {count}</Text>
        <View style={styles.row}>
          <Button title="-" onPress={() => setCount(Math.max(0, count - 1))} />
          <Button title="+" onPress={() => setCount(count + 1)} />
        </View>
      </View>

      <View style={styles.section}>
        <Button title="Update Widget" onPress={updateWidget} />
      </View>

      <View style={styles.section}>
        <Button
          title="Update (Type-Safe)"
          onPress={updateWidgetTypeSafe}
          color="#007AFF"
        />
      </View>

      <View style={styles.section}>
        <Button
          title="Read Data"
          onPress={readWidgetData}
          color="#34C759"
        />
      </View>

      <View style={styles.section}>
        <Button
          title="Clear Widget"
          onPress={clearWidget}
          color="#FF3B30"
        />
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
});
```

### API Methods

```typescript
// Storage methods
helloWidget.set(key: string, value: any): void
helloWidget.get<T>(key: string): T | null
helloWidget.remove(key: string): void
helloWidget.clear(): void

// Batch operations
helloWidget.setData(data: Record<string, any>): void
helloWidget.getData<T>(): T

// Lifecycle
helloWidget.refresh(): void
```

## Step 6: Build and Deploy

### Generate Native Project

```bash
npx expo prebuild -p ios --clean
```

Expected output:

```
[expo-targets] Found 1 target(s)
[expo-targets] Processing hello-widget: type=widget, name=HelloWidget
[expo-targets] Successfully configured HelloWidget target
```

### Build in Xcode

Open workspace:

```bash
open ios/YourApp.xcworkspace
```

In Xcode:

1. Select your main app scheme
2. Choose a device or simulator (iOS 14+)
3. Click **Run** (Cmd+R)

### Verify Target

In Xcode Project Navigator:

- See `HelloWidget` target
- Check `HelloWidget` folder contains `Widget.swift`, `Info.plist`
- Verify `Assets.xcassets` contains color sets

### Add Widget to Home Screen

Once app is running:

1. **Long press** on home screen
2. **Tap "+"** button (top left)
3. **Search** for "Hello Widget"
4. **Select size** (Small, Medium, or Large)
5. **Tap "Add Widget"**
6. **Done**

### Test Updates

1. Open your app
2. Enter a message and count
3. Tap "Update Widget"
4. Go to home screen → widget updates immediately

## Troubleshooting

### Widget not appearing?

**Solution:**

1. Run `npx expo prebuild -p ios --clean`
2. Open Xcode → Check widget target exists
3. Verify `Info.plist` in `targets/hello-widget/ios/`
4. Clean build folder (Cmd+Shift+K)

### Widget not updating?

**Solution:**

1. Verify App Group IDs match exactly:
   ```json
   // app.json
   "entitlements": {
     "com.apple.security.application-groups": ["group.com.yourcompany.myapp"]
   }
   ```
   ```json
   // expo-target.config.json
   "appGroup": "group.com.yourcompany.myapp"
   ```
   ```swift
   // Widget.swift
   UserDefaults(suiteName: "group.com.yourcompany.myapp")
   ```
2. Call `helloWidget.refresh()` after setting data
3. Test on physical device (simulators cache aggressively)
4. Force reload: Remove widget and re-add

### Build errors?

**"No such module 'WidgetKit'":**

- Check deployment target is iOS 14.0+
- Verify `WidgetKit.framework` in Build Phases

**"Cannot find type 'TimelineProvider'":**

- Add `import WidgetKit` to Swift file
- Check Swift version in build settings (5.0+)

**Generic build failures:**

1. Clean: Product → Clean Build Folder (Cmd+Shift+K)
2. Delete derived data: Xcode → Preferences → Locations
3. Re-prebuild: `rm -rf ios/ && npx expo prebuild -p ios --clean`

## Next Steps

### Create More Targets

```bash
npx create-target
```

Try other target types:

- **App Clip**: Lightweight app experiences
- **Share Extension**: Share content to your app
- **iMessage Stickers**: Custom sticker packs

### Advanced Features

- Multiple widget sizes with size-specific views
- Network requests in timeline provider
- Complex data with JSON encoding
- Widget configuration (IntentConfiguration)
- Interactive buttons (iOS 17+)

### Additional Resources

- [API Reference](./api-reference.md)
- [Config Reference](./config-reference.md)
- [Example Apps](../apps/)

Congratulations! You've successfully created an iOS widget with expo-targets. 🎉
