# Bare RN Share Extension

Example demonstrating share extensions with React Native UI in a bare React Native workflow — supports both iOS and Android.

## Overview

This app shows how to create share extensions with React Native UI using expo-targets in an existing bare React Native project. The same code works on both iOS and Android with platform-specific optimizations.

## Workflow: Bare React Native

This example uses `expo-targets sync` to add the extension target to your existing Xcode project, rather than generating the entire project with `expo prebuild`.

### Setup Steps

1. **Ensure you have an existing React Native project**
   ```bash
   # Your project should already have ios/ and/or android/ directories
   ls ios/    # For iOS support
   ls android/  # For Android support
   ```

2. **Install expo-targets**
   ```bash
   npm install expo-targets
   ```

3. **Configure app.json**
   ```json
   {
     "expo": {
       "ios": {
         "entitlements": {
           "com.apple.security.application-groups": [
             "group.com.test.barernshare"
           ]
         }
       },
       "android": {
         "package": "com.test.barernshare"
       },
       "plugins": ["expo-targets"]
     }
   }
   ```

4. **Create target configuration**
   ```bash
   # Create targets/share-extension/expo-target.config.json
   # See targets/share-extension/expo-target.config.json in this app
   ```

5. **Create React Native extension component**
   ```bash
   # Create targets/share-extension/src/ShareExtension.tsx
   # See targets/share-extension/src/ShareExtension.tsx in this app
   ```

6. **Configure Metro** (Required for React Native extensions)
   ```javascript
   // metro.config.js
   const { getDefaultConfig } = require('expo/metro-config');
   const { withTargetsMetro } = require('expo-targets/metro');

   module.exports = withTargetsMetro(getDefaultConfig(__dirname), {
     projectRoot: __dirname,
   });
   ```

7. **Sync targets to Xcode (iOS)**
   ```bash
   npx expo-targets sync
   cd ios
   pod install
   cd ..
   ```

8. **Build and Run**
   
   **iOS (Release mode required):**
   ```bash
   open ios/YourApp.xcworkspace
   # Select Release configuration
   # Build and run
   ```
   
   **Android:**
   ```bash
   npx expo run:android
   # Or open in Android Studio: android/
   ```

## Key Requirements

### Metro Configuration

React Native extensions **require** Metro configuration with `withTargetsMetro`:

```javascript
// metro.config.js
const { withTargetsMetro } = require('expo-targets/metro');
module.exports = withTargetsMetro(config, { projectRoot });
```

This wrapper:
- Handles extension entry points
- Configures bundling for extensions
- Sets up proper module resolution

### Platform-Specific Notes

#### iOS

**Release Mode Required:** React Native extensions only work in Release builds, not Debug.

In Xcode:
1. Select your scheme
2. Edit scheme → Run → Build Configuration
3. Set to **Release**
4. Build and run

**App Groups:** Required for data sharing between main app and extension.

#### Android

**Works in Debug Mode:** Unlike iOS, Android share activities work in both Debug and Release builds.

**No App Groups Needed:** Android uses SharedPreferences with the app's package name for data sharing.

**Automatic Registration:** The share activity is automatically added to AndroidManifest.xml during prebuild.

### Entry Point

The extension entry point is specified in config:

```json
{
  "entry": "./targets/share-extension/src/index.tsx"
}
```

This file registers the React Native component:

```typescript
import { createTarget } from 'expo-targets';
import ShareExtension from './src/ShareExtension';

export const shareExtensionTarget = createTarget<'share'>('ShareExtension', ShareExtension);
```

## File Structure

```
bare-rn-share/
├── ios/                          # Existing Xcode project (manually managed)
│   ├── YourApp.xcodeproj/
│   ├── Podfile
│   └── ...
├── targets/
│   └── share-extension/
│       ├── expo-target.config.json
│       ├── index.tsx              # Entry point (registers RN component)
│       └── src/
│           └── ShareExtension.tsx  # React Native UI component
├── metro.config.js               # Required for RN extensions
├── app.json
└── package.json
```

## Troubleshooting

### Extension not appearing?

1. Run `npx expo-targets sync` again
2. Check Metro config has `withTargetsMetro`
3. Verify entry point path in config
4. Check Xcode project for extension target

### Extension crashes?

1. **Build in Release mode** (not Debug)
2. Verify Metro config is correct
3. Check React Native bundle is built
4. Verify entry point registers component correctly

### Metro bundling issues?

1. Ensure `metro.config.js` uses `withTargetsMetro`
2. Check entry point path matches file location
3. Verify React Native dependencies installed
4. Clear Metro cache: `npx expo start --clear`

### Data not syncing?

1. Verify App Group IDs match:
   - `app.json` entitlements
   - `expo-target.config.json` appGroup
2. Check `setData()` and `getData()` usage
3. Verify data structure matches

## Differences from Managed Workflow

| Managed Workflow | Bare RN Workflow |
|-----------------|------------------|
| `expo prebuild` generates `ios/` | `expo-targets sync` adds to existing `ios/` |
| Metro config auto-configured | Must configure Metro manually |
| Works out of the box | Requires Release mode setup |
| Full project regeneration | Incremental target addition |

## Next Steps

- See `extensions-showcase` for managed workflow examples
- Compare with `bare-rn-widgets` for widget examples
- Check main docs for complete API reference

