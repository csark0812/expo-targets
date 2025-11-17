# Extensions Showcase

A comprehensive example app demonstrating Share and Action extensions with React Native UI using expo-targets.

## Overview

This app showcases two extension types:

1. **Share Extension** - Share content from other apps (Safari, Photos, etc.)
2. **Action Extension** - Process images with filters from Photos app

Both extensions use React Native for their UI, demonstrating how to build rich extension experiences with expo-targets.

## Quick Start

```bash
cd apps/extensions-showcase
bun install
npx expo prebuild -p ios --clean
npx expo run:ios
```

## Extension Examples

### 1. Share Extension

**Type:** `share`
**Complexity:** ⭐⭐ Medium
**Features:**

- React Native UI
- Handles text, URLs, and images
- Saves shared content to App Group storage
- Main app displays shared items history

**Use Case:** Capture content from other apps (articles, images, links) and save them to your app.

**How to Test:**

1. Build and run the app
2. Open Safari or Photos app
3. Tap the Share button
4. Select "Share Content" from the share sheet
5. Review shared content and tap "Save"
6. Return to the main app to see the shared item

**Files:**

- `targets/share-content/expo-target.config.json` - Extension configuration
- `targets/share-content/index.tsx` - Entry point with target registration
- `targets/share-content/src/ShareExtension.tsx` - React Native UI component

**Key Concepts:**

- React Native entry point configuration
- Metro configuration for extensions
- `getSharedData()` to receive shared content
- `setData()` to save to App Group storage
- `close()` to dismiss extension

### 2. Action Extension

**Type:** `action`
**Complexity:** ⭐⭐⭐ Advanced
**Features:**

- React Native UI with filter selection
- Processes images from Photos app
- Saves processed items to App Group storage
- Main app displays processing history

**Use Case:** Apply transformations or filters to images from the Photos app.

**How to Test:**

1. Build and run the app
2. Open Photos app
3. Select an image
4. Tap Share → "Image Action"
5. Choose a filter (Original, Grayscale, Sepia, Invert, Brighten)
6. Tap "Process"
7. Return to the main app to see the processed item

**Files:**

- `targets/image-action/expo-target.config.json` - Extension configuration
- `targets/image-action/index.tsx` - Entry point with target registration
- `targets/image-action/src/ImageActionExtension.tsx` - React Native UI component

**Key Concepts:**

- Action extension activation rules (image only)
- Filter selection UI
- Simulated processing workflow
- Data persistence between extension and main app

## Architecture Patterns

### Extension Entry Point

```typescript
import { createTarget } from 'expo-targets';
import ShareExtension from './src/ShareExtension';

export const shareContentTarget = createTarget<'share'>(
  'ShareContent',
  ShareExtension
);
```

**Important:** The second parameter is the React Native component that will render the extension UI.

### Receiving Shared Data

Extensions automatically receive shared content via props:

```typescript
interface ShareExtensionProps {
  text?: string;
  url?: string;
  images?: string[];
  files?: string[];
}

export default function ShareExtension(props: ShareExtensionProps) {
  // props contains the shared content
}
```

### Saving Data

Extensions save data to App Group storage:

```typescript
const existingData = shareContentTarget.getData<{ items: SharedItem[] }>() || {
  items: [],
};
const newItem: SharedItem = {
  id: Date.now().toString(),
  sharedAt: new Date().toISOString(),
  content: props,
};
const updatedItems = [...existingData.items, newItem];
shareContentTarget.setData({ items: updatedItems });
```

### Closing Extension

```typescript
shareContentTarget.close(); // Dismisses the extension
```

### Opening Host App

```typescript
shareContentTarget.openHostApp('/path'); // Opens main app with deep link
```

## Metro Configuration

Extensions require Metro configuration for React Native bundling:

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withTargetsMetro } = require('expo-targets/metro');

module.exports = withTargetsMetro(getDefaultConfig(__dirname), {
  projectRoot: __dirname,
});
```

## Activation Rules

Configure what content types trigger your extension:

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

**Available types:**

- `text` - Plain text content
- `url` - URLs
- `image` - Images (use `maxCount` to limit)
- `file` - Files
- `movie` - Video files

## Data Sharing

Both extensions and the main app use the same App Group:

```json
{
  "appGroup": "group.com.test.extensionsshowcase"
}
```

This allows:

- Extensions to save data
- Main app to read saved data
- Real-time synchronization

## Main App Integration

The main app reads shared/processed items:

```typescript
const shareData = shareContentTarget.getData<{ items: SharedItem[] }>();
if (shareData?.items) {
  setSharedItems(shareData.items);
}
```

## Common Patterns

### Extension Lifecycle

1. **User triggers extension** - From share sheet or action menu
2. **Extension receives data** - Via props (share) or `getSharedData()` (action)
3. **User interacts** - Uses React Native UI
4. **Extension saves data** - Uses `setData()` to store in App Group
5. **Extension closes** - Calls `close()` to dismiss
6. **Main app updates** - Reads new data from App Group

### Error Handling

```typescript
const handleSave = () => {
  try {
    if (!props.text && !props.url && !props.images?.length) {
      // Show error or just close
      shareContentTarget.close();
      return;
    }

    // Save data
    shareContentTarget.setData({ items: updatedItems });
    shareContentTarget.close();
  } catch (error) {
    console.error('Failed to save:', error);
    // Handle error
  }
};
```

### Loading States

```typescript
const [processing, setProcessing] = useState(false);

const handleProcess = () => {
  setProcessing(true);

  // Simulate async work
  setTimeout(() => {
    // Process and save
    setProcessing(false);
    imageActionTarget.close();
  }, 1000);
};
```

## Troubleshooting

### Extension not appearing?

1. Run `npx expo prebuild -p ios --clean`
2. Check Xcode project for extension targets
3. Verify `Info.plist` configuration
4. Ensure activation rules match content type

### Extension crashes?

1. Check memory limits (extensions have strict limits)
2. Verify React Native bundle is built
3. Test in Release mode (RN extensions only work in Release)
4. Check console logs for errors

### Data not syncing?

1. Verify App Group IDs match exactly:
   - `app.json` entitlements
   - `expo-target.config.json` appGroup
   - Extension and main app configs
2. Check data structure matches
3. Verify `setData()` and `getData()` usage

### Metro bundling issues?

1. Ensure `metro.config.js` uses `withTargetsMetro`
2. Check entry point path in config matches file location
3. Verify React Native dependencies are installed
4. Clear Metro cache: `npx expo start --clear`

## Next Steps

After exploring this showcase:

1. **Modify extensions** - Add new features or UI elements
2. **Create your own** - Use these patterns for your extensions
3. **Explore widgets** - Check out `widgets-showcase` for widget examples
4. **Bare RN workflow** - See `bare-rn-share` for bare React Native examples

## Resources

- [Main Documentation](../../docs/getting-started.md)
- [API Reference](../../docs/api-reference.md)
- [Config Reference](../../docs/config-reference.md)
- [React Native Extensions Guide](../../docs/react-native-extensions.md)
- [Other Examples](../README.md)
