# React Native in Extensions

Build share extensions, action extensions, App Clips, and iMessage apps using React Native instead of native Swift/Kotlin.

## Supported Types

| Type       | React Native Support | Notes                    |
| ---------- | -------------------- | ------------------------ |
| `share`    | ✅ Full support      | Custom UI for sharing    |
| `action`   | ✅ Full support      | Process content in place |
| `clip`     | ✅ Full support      | Lightweight app preview  |
| `messages` | ✅ Full support      | iMessage app with RN UI  |
| `widget`   | ❌ SwiftUI only      | iOS uses WidgetKit       |
| `stickers` | ❌ Native only       | Static image assets      |

---

## Quick Setup

### 1. Create the Target

```bash
npx create-expo-target
# Choose: Share Extension → share-ext → iOS → Yes (Use React Native)
```

Or manually configure `expo-target.config.json`:

```json
{
  "type": "share",
  "name": "ShareExt",
  "platforms": ["ios"],
  "appGroup": "group.com.yourcompany.yourapp",
  "entry": "./targets/share-ext/index.tsx",
  "excludedPackages": ["expo-updates", "expo-dev-client"]
}
```

Key fields:

- `entry`: Path to your React Native entry file **(relative to project root)**
- `excludedPackages`: Packages to exclude from the extension bundle (reduces size)

### 2. Create the Entry Point

```typescript
// targets/share-ext/index.tsx
import { createTarget } from 'expo-targets';
import ShareExtension from './src/ShareExtension';

// Pass the component as the second argument - handles registration automatically
export const shareTarget = createTarget<'share'>('ShareExt', ShareExtension);
```

The second parameter to `createTarget` automatically calls `AppRegistry.registerComponent()` for you. The name must match the `name` field in your config exactly.

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

**Required for all React Native extensions.** This enables Metro to bundle your extension's entry point separately from the main app.

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withTargetsMetro } = require('expo-targets/metro');

module.exports = withTargetsMetro(getDefaultConfig(__dirname));
```

The Metro wrapper:

- Discovers targets with an `entry` field in their config
- Creates separate bundles for each extension
- Excludes packages listed in `excludedPackages`

> **Note:** Pure Swift/SwiftUI extensions (like widgets) do NOT need Metro configuration.

### 5. Build and Run

```bash
npx expo prebuild
npx expo run:ios
```

For testing extensions in Release mode (recommended for performance testing):

```bash
npx expo run:ios --configuration Release
```

---

## Naming Conventions

**All names must match exactly** — this is the most common source of bugs:

| Location                  | Value          | Example      |
| ------------------------- | -------------- | ------------ |
| Config `name` field       | PascalCase     | `"ShareExt"` |
| `createTarget()` argument | Same as config | `'ShareExt'` |

**If these don't match**, the extension will crash on launch with no useful error message.

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
} from 'expo-targets';
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
import { createTarget, close } from 'expo-targets';

const shareTarget = createTarget('ShareExt');

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
import { createTarget } from 'expo-targets';

const shareTarget = createTarget('ShareExt');
const data = shareTarget.getData();
console.log('Last shared:', data?.lastShared);
```

### Opening the Main App

Use `openHostApp()` to open your main app with a deep link:

```typescript
import { openHostApp } from 'expo-targets';

function handleOpenInApp() {
  // Opens: com.yourcompany.yourapp://shared/123
  openHostApp('/shared/123');
  // Extension closes automatically after opening host app
}
```

**No additional setup required** — expo-targets automatically uses your bundle identifier as the URL scheme.

In your main app, handle the deep link:

```typescript
// App.tsx
import { Linking } from 'react-native';
import { useEffect } from 'react';

useEffect(() => {
  const handleUrl = ({ url }: { url: string }) => {
    const path = url.split('://')[1]; // "shared/123"
    // Navigate based on path
  };

  // Handle cold start
  Linking.getInitialURL().then((url) => url && handleUrl({ url }));

  // Handle warm start
  const sub = Linking.addEventListener('url', handleUrl);
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

**Important:** These are approximate limits. iOS may terminate extensions using less memory under system pressure. Always test on physical devices.

**Reference:** [Apple's App Extension Programming Guide](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/)

### Excluding Packages

Reduce bundle size by excluding packages your extension doesn't need:

```json
{
  "excludedPackages": [
    "expo-updates",
    "expo-dev-client",
    "@react-native-community/netinfo",
    "react-native-reanimated"
  ]
}
```

**Common exclusions:**

| Package                   | Reason                     | Savings |
| ------------------------- | -------------------------- | ------- |
| `expo-updates`            | OTA updates not needed     | ~500KB  |
| `expo-dev-client`         | Dev tools not needed       | ~800KB  |
| `react-native-reanimated` | Heavy animation library    | ~1.5MB  |
| `@sentry/react-native`    | Error reporting not needed | ~1MB    |
| `react-native-screens`    | Native nav not needed      | ~300KB  |

### Tips for Smaller Bundles

1. **Exclude aggressively** — Start minimal, add packages only when needed
2. **Avoid heavy UI libraries** — Use basic React Native components
3. **Keep extension logic minimal** — Do heavy processing in your main app
4. **Test on physical devices** — Simulators are more forgiving with memory

---

## Debugging Extensions

Extensions run in a **separate process** with limited debugging capabilities. They **do not connect to Metro** — no hot reloading, no Chrome DevTools.

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
- No hot reloading — changes require full rebuild
- Use `console.log()` extensively

**Breakpoint Debugging:**

- Swift breakpoints work normally in Xcode
- JavaScript breakpoints do NOT work (no Metro connection)
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
  - Add more packages to excludedPackages
  - Verify App Group IDs match everywhere
```

**Component doesn't render:**

```
Symptoms: Extension shows blank/white screen
Causes:
  - Entry file path wrong in config
  - Metro config wrapper not applied
  - Component not passed to createTarget
Solutions:
  - Verify entry path is relative to project root
  - Check metro.config.js has withTargetsMetro wrapper
  - Ensure component is passed as second arg: createTarget('Name', Component)
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
import { createTarget } from 'expo-targets';
import MessagesApp from './MessagesApp';

// Pass component as second argument - name must match config exactly
export const messagesTarget = createTarget<'messages'>(
  'MyMessages',
  MessagesApp
);
```

### Using Messages APIs

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { createTarget } from 'expo-targets';

const messages = createTarget<'messages'>('MyMessages');

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
const messages = createTarget<'messages'>('MyMessages');

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

- **[extensions-showcase](../apps/extensions-showcase/)** — React Native share and action extensions
- **[bare-rn-share](../apps/bare-rn-share/)** — Share extension in bare RN workflow

```bash
cd apps/extensions-showcase
npm install
npx expo prebuild
npx expo run:ios
```
