# React Native in Extensions

Guide to using React Native rendering in share extensions, action extensions, and App Clips.

## Overview

expo-targets supports React Native rendering in extensions that have UI components. This allows you to reuse your React Native components and logic in extensions.

### Supported Extension Types

| Type       | React Native Support | Status       |
| ---------- | -------------------- | ------------ |
| `share`    | ✅ Full support      | Production   |
| `action`   | ✅ Full support      | Production   |
| `clip`     | ✅ Full support      | Production   |
| `messages` | ✅ Full support      | Production   |
| `widget`   | ❌ Not supported     | SwiftUI only |
| `stickers` | ❌ Not supported     | Native only  |

## Quick Start

### 1. Configure Target for React Native

In `targets/share-ext/expo-target.config.json`:

```json
{
  "type": "share",
  "name": "ShareExt",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "entry": "./targets/share-ext/index.tsx",
  "excludedPackages": ["expo-updates", "expo-dev-client"],
  "ios": {
    "deploymentTarget": "13.0"
  }
}
```

**Key fields:**

- `entry`: Path to React Native entry file
- `excludedPackages`: Packages to exclude from bundle (reduces size)

### 2. Create Extension Entry Point

Create `targets/share-ext/index.tsx`:

```typescript
import { AppRegistry } from 'react-native';
import ShareExtension from './src/ShareExtension';

AppRegistry.registerComponent('ShareExt', () => ShareExtension);
```

**Important:** Component name must match the target `name` field.

### 3. Create React Native Component

Create `targets/share-ext/src/ShareExtension.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { createTarget, getSharedData, close, openHostApp } from 'expo-targets';
import type { SharedData } from 'expo-targets';

const shareTarget = createTarget('ShareExt');

export default function ShareExtension() {
  const [sharedData, setSharedData] = useState<SharedData | null>(null);

  useEffect(() => {
    const data = getSharedData();
    setSharedData(data);
  }, []);

  const handleSave = () => {
    if (sharedData?.url) {
      shareTarget.set('lastShared', sharedData.url);
      shareTarget.set('timestamp', Date.now());
    }
    close();
  };

  const handleOpenApp = () => {
    openHostApp('/shared-content');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Share to MyApp</Text>

      {sharedData?.text && (
        <Text style={styles.data}>Text: {sharedData.text}</Text>
      )}

      {sharedData?.url && (
        <Text style={styles.data}>URL: {sharedData.url}</Text>
      )}

      {sharedData?.images && (
        <Text style={styles.data}>
          Images: {sharedData.images.length} file(s)
        </Text>
      )}

      <View style={styles.buttons}>
        <Button title="Save & Close" onPress={handleSave} />
        <Button title="Open App" onPress={handleOpenApp} color="#007AFF" />
        <Button title="Cancel" onPress={close} color="#FF3B30" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  data: {
    fontSize: 16,
    marginBottom: 10,
  },
  buttons: {
    marginTop: 20,
    gap: 10,
  },
});
```

### 4. Configure Metro

Wrap your Metro config with `withTargetsMetro`:

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withTargetsMetro } = require('expo-targets/metro');

module.exports = withTargetsMetro(getDefaultConfig(__dirname));
```

### 5. Build

```bash
npx expo prebuild -p ios --clean
npx expo run:ios --configuration Release
```

**Note:** Extensions must be built in Release mode.

## Configuration Reference

### `entry` Field

**Type:** `string`

Path to React Native entry point file.

```json
{
  "entry": "./targets/share-ext/index.tsx"
}
```

**Requirements:**

- Must be a valid path relative to project root
- File must exist at prebuild time
- File must register a component with `AppRegistry`
- Component name must match target `name`

**Supported formats:**

- `.tsx`, `.ts`, `.jsx`, `.js`

### `excludedPackages` Field

**Type:** `string[]`

Expo/React Native packages to exclude from extension bundle.

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

| Package                                     | Why Exclude                                | Size Savings |
| ------------------------------------------- | ------------------------------------------ | ------------ |
| `expo-updates`                              | OTA updates not needed in extensions       | ~500KB       |
| `expo-dev-client`                           | Development tools not needed in production | ~800KB       |
| `@react-native-community/netinfo`           | Network monitoring not needed              | ~100KB       |
| `react-native-reanimated`                   | Animations library if not used             | ~1.5MB       |
| `@react-native-async-storage/async-storage` | Use App Groups instead                     | ~200KB       |

**Tips:**

- Start with minimal exclusions
- Add packages you don't use in the extension
- Monitor bundle size with Metro output
- Test thoroughly after excluding packages

## Extension APIs

### Getting Shared Data

```typescript
import { getSharedData } from 'expo-targets';
import type { SharedData } from 'expo-targets';

const data = getSharedData();

// SharedData interface:
interface SharedData {
  text?: string; // Plain text content
  url?: string; // URL string
  images?: string[]; // Array of image file URLs
  webpageUrl?: string; // Webpage URL (if shared from Safari)
  webpageTitle?: string; // Webpage title
  preprocessedData?: any; // Custom preprocessed data
}
```

### Closing Extension

```typescript
import { close } from 'expo-targets';

function handleDone() {
  // Save data...
  close(); // Dismisses extension
}
```

### Opening Host App

```typescript
import { openHostApp } from 'expo-targets';

function handleOpenApp() {
  openHostApp('/shared-content?id=123');
  // Host app opens to specified deep link path
}
```

**Requirements:**

- Configure deep linking in main app
- Use URL scheme: `{bundleId}://{path}`

## Best Practices

### 1. Keep Bundle Size Small

Extensions have memory and size constraints.

**Good:**

```json
{
  "excludedPackages": [
    "expo-updates",
    "expo-dev-client",
    "@react-native-community/netinfo"
  ]
}
```

**Avoid:**

- Large dependencies (chart libraries, etc.)
- Unused UI component libraries
- Heavy animation libraries

### 2. Use Shared Components

Create a shared components folder:

```
targets/
  ├── _shared/
  │   ├── Button.tsx
  │   ├── TextField.tsx
  │   └── styles.ts
  └── share-ext/
      └── src/
          └── ShareExtension.tsx  # Imports from _shared
```

### 3. Handle Errors Gracefully

```typescript
export default function ShareExtension() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const data = getSharedData();
      if (!data) {
        setError('No data shared');
        return;
      }
      setSharedData(data);
    } catch (err) {
      setError('Failed to load shared content');
    }
  }, []);

  if (error) {
    return (
      <View style={styles.error}>
        <Text>{error}</Text>
        <Button title="Close" onPress={close} />
      </View>
    );
  }

  // Render normal UI...
}
```

### 4. Store Data for Main App

Use App Group storage to pass data to main app:

```typescript
import { createTarget } from 'expo-targets';

const shareTarget = createTarget('ShareExt');

function handleSave(url: string) {
  // Store for main app to read
  shareTarget.setData({
    lastShared: url,
    timestamp: Date.now(),
    type: 'url',
  });

  close();
}
```

Main app reads:

```typescript
import { shareTarget } from './targets/share-ext';

function checkSharedData() {
  const data = shareTarget.getData();
  if (data?.lastShared) {
    console.log('User shared:', data.lastShared);
    // Process shared content...
  }
}
```

### 5. Build in Release Mode

Extensions don't work in Debug mode due to JavaScript runtime differences.

```bash
# iOS
npx expo run:ios --configuration Release

# Or build in Xcode with Release scheme
```

## Advanced Patterns

### Preprocessing Web Content

For share extensions that accept web pages, you can preprocess the content:

**1. Create preprocessing script:**

Create `targets/share-ext/preprocessing.js`:

```javascript
var ExtensionPreprocessingJS = {
  run: function (arguments) {
    arguments.completionFunction({
      url: document.URL,
      title: document.title,
      selection: window.getSelection().toString(),
    });
  },
};
```

**2. Configure in target:**

```json
{
  "type": "share",
  "ios": {
    "activationRules": [{ "type": "webpage" }],
    "preprocessingFile": "./targets/share-ext/preprocessing.js"
  }
}
```

**3. Access in React Native:**

```typescript
const data = getSharedData();
console.log(data.preprocessedData); // { url, title, selection }
```

### Multiple Entry Points

For complex extensions, split logic:

```
targets/share-ext/
  ├── index.tsx              # Entry point
  ├── src/
  │   ├── ShareExtension.tsx # Main component
  │   ├── screens/
  │   │   ├── ShareText.tsx
  │   │   ├── ShareImage.tsx
  │   │   └── ShareURL.tsx
  │   └── hooks/
  │       └── useSharedData.ts
```

### Custom Navigation

Use React Navigation for multi-screen extensions:

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function ShareExtension() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Share" component={ShareScreen} />
        <Stack.Screen name="Preview" component={PreviewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Troubleshooting

### Extension crashes on launch

**Causes:**

- Built in Debug mode
- Missing `AppRegistry.registerComponent`
- Component name mismatch

**Solution:**

```bash
# Rebuild in Release
npx expo run:ios --configuration Release
```

### Bundle size too large

**Causes:**

- Too many dependencies
- Not excluding unnecessary packages

**Solution:**

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

### Extension UI not rendering

**Causes:**

- Metro config not wrapped
- Entry file not found
- Wrong component name

**Solution:**

```javascript
// metro.config.js
const { withTargetsMetro } = require('expo-targets/metro');
module.exports = withTargetsMetro(getDefaultConfig(__dirname));
```

### Shared data returns null

**Causes:**

- Extension doesn't have proper activation rules
- Content type not supported
- iOS permissions not granted

**Solution:**

```json
{
  "ios": {
    "activationRules": [
      { "type": "text" },
      { "type": "url" },
      { "type": "image", "maxCount": 5 }
    ]
  }
}
```

## Examples

See working examples:

- [extensions-showcase](../apps/extensions-showcase/) - React Native share, action, and messages extensions
- [clips-and-stickers](../apps/clips-and-stickers/) - App Clip with data sharing
- [bare-rn-share](../apps/bare-rn-share/) - Bare React Native share extension

## See Also

- [API Reference](./api-reference.md)
- [Config Reference](./config-reference.md)
- [Share Extension Config](./SHARE_EXTENSION_CONFIG.md)
