# Android Share Extensions - Implementation Summary

This document provides a comprehensive overview of the Android share extensions support added to expo-targets.

## Overview

Android share extensions are now fully supported in expo-targets, allowing developers to create share extensions with React Native that work on both iOS and Android using the same codebase.

## Key Features

### 1. Automatic Configuration
- **Activity Registration**: Share activities are automatically registered in AndroidManifest.xml
- **Intent Filters**: Configured for ACTION_SEND and ACTION_SEND_MULTIPLE
- **MIME Types**: Supports text/plain, image/*, video/*, and */* by default
- **Theme Generation**: Automatic theme creation for share activities

### 2. React Native Support
- **Same Code, Both Platforms**: Write once, run on iOS and Android
- **Metro Integration**: Seamless bundling with withTargetsMetro
- **Hot Reload**: Works in Debug mode (unlike iOS)
- **Component Registration**: Automatic via createTarget()

### 3. Data Handling
- **getSharedData()**: Extracts content from share intents
- **openHostApp()**: Opens main app with deep linking
- **closeExtension()**: Closes the share activity
- **Storage**: Uses SharedPreferences (no App Groups needed)

## Architecture Differences: iOS vs Android

| Aspect | iOS | Android |
|--------|-----|---------|
| Process | Separate extension process | Same app process |
| Configuration | Extension target in Xcode | Activity in AndroidManifest.xml |
| Memory Limit | ~120MB | ~512MB typical |
| Debug Mode | Release only | Works in Debug & Release |
| Data Sharing | App Groups (UserDefaults) | SharedPreferences |
| Metro | Not connected | Connected in Debug mode |
| Setup Complexity | Higher (Podfile, entitlements) | Lower (automatic manifest) |

## Implementation Details

### Files Created/Modified

1. **ExpoTargetsExtensionModule.kt**
   - Location: `packages/expo-targets/android/src/main/java/expo/modules/targets/extension/`
   - Purpose: Native module for extension operations
   - Functions: closeExtension(), openHostApp(path), getSharedData()
   - Intent handling for ACTION_SEND and ACTION_SEND_MULTIPLE

2. **withAndroidShareExtension.ts**
   - Location: `packages/expo-targets/plugin/src/android/`
   - Purpose: Config plugin for share extensions
   - Features:
     - Adds share activity to AndroidManifest.xml
     - Generates theme resources
     - Configures source sets in build.gradle
     - Creates Activity template from template file

3. **ShareActivity.kt.template**
   - Location: `packages/expo-targets/plugin/src/android/templates/`
   - Purpose: Template for share activity
   - Extends: ReactActivity
   - Features: Automatic React Native component registration

4. **withAndroidTarget.ts**
   - Modified to route 'share' and 'action' types to withAndroidShareExtension

### Configuration

Example `expo-target.config.json`:

```json
{
  "type": "share",
  "name": "ShareExtension",
  "displayName": "Share to My App",
  "platforms": ["ios", "android"],
  "entry": "./targets/share-extension/index.tsx",
  "appGroup": "group.com.yourcompany.yourapp"
}
```

### Generated AndroidManifest.xml Entry

```xml
<activity
    android:name=".share.ShareExtensionShareActivity"
    android:label="Share to My App"
    android:theme="@style/Theme.ShareExtensionShare"
    android:exported="true"
    android:excludeFromRecents="true"
    android:taskAffinity=""
    android:launchMode="singleTask">
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <action android:name="android.intent.action.SEND_MULTIPLE" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="text/plain" />
    </intent-filter>
    <!-- Additional intent filters for image/*, video/*, */* -->
</activity>
```

## API Usage

### JavaScript/TypeScript

```typescript
import { createTarget, getSharedData, close, openHostApp } from 'expo-targets';

// Get shared content
const data = getSharedData();
// Returns: { text?, url?, images?, videos?, files?, title? }

// Close the share extension
close();

// Open main app with deep link
openHostApp('/shared/content');

// Store data for main app to read later
const shareTarget = createTarget('ShareExtension');
shareTarget.setData({ lastShared: data });
```

### Data Structure

```typescript
interface SharedData {
  text?: string;      // Plain text content
  url?: string;       // URL (auto-detected from text)
  title?: string;     // Subject/title (from Intent.EXTRA_SUBJECT)
  images?: string[];  // Array of image URIs
  videos?: string[];  // Array of video URIs
  files?: string[];   // Array of file URIs
}
```

## Testing

### Manual Testing

1. Build and install the app:
   ```bash
   npx expo run:android
   ```

2. Open another app (Chrome, Gallery, Files)

3. Share content (text, image, file)

4. Your app should appear in the share sheet

5. Tap your app to open the share extension

### Automated Testing

Tests are located in `tests/e2e/runtime/share/android-share.test.ts`:

- Activity registration validation
- Theme generation validation
- Activity template validation
- Source sets configuration validation
- Module implementation validation
- MIME type support validation

Run tests:
```bash
cd tests/e2e
bun test runtime/share/android-share.test.ts
```

## Debugging

### Viewing Logs

```bash
# All React Native logs
adb logcat | grep -i ReactNative

# Filter by package
adb logcat | grep com.yourcompany.yourapp

# Colored output
adb logcat -v color
```

### Common Issues

1. **Share activity not appearing in share sheet**
   - Run `npx expo prebuild` to regenerate AndroidManifest.xml
   - Check that android platform is in expo-target.config.json
   - Verify MIME types match the content being shared

2. **Activity crashes on launch**
   - Check Metro is running: `npx expo start`
   - Verify entry point path in config
   - Check component name matches in createTarget()

3. **Data not shared correctly**
   - Log the Intent extras in the Activity
   - Verify getSharedData() implementation
   - Check MIME type handling

## Examples

Two example apps have been updated to support Android:

### 1. bare-rn-share
- Location: `apps/bare-rn-share/`
- Demonstrates: Bare React Native workflow
- Features: Cross-platform share extension with styled UI

### 2. extensions-showcase
- Location: `apps/extensions-showcase/`
- Demonstrates: Managed workflow
- Features: Multiple extension types including share

## Future Enhancements

Potential future improvements:

1. **Custom MIME Type Filters**: Allow per-target MIME type configuration
2. **Android Instant Apps**: Android equivalent to iOS App Clips
3. **File Handling**: Better support for copying shared files to app storage
4. **Rich Content**: Support for rich content types (contacts, locations)
5. **Multiple Activities**: Support for multiple share activities per app

## Migration Guide

### For Existing iOS-Only Projects

1. Update target config to include "android" in platforms:
   ```json
   {
     "platforms": ["ios", "android"]
   }
   ```

2. Add Android package to app.json:
   ```json
   {
     "android": {
       "package": "com.yourcompany.yourapp"
     }
   }
   ```

3. Run prebuild:
   ```bash
   npx expo prebuild --platform android
   ```

4. Build and test:
   ```bash
   npx expo run:android
   ```

### Breaking Changes

None. Android support is additive and doesn't affect existing iOS implementations.

## Resources

- [Android Intents and Intent Filters](https://developer.android.com/guide/components/intents-filters)
- [React Native Activity](https://reactnative.dev/docs/native-modules-android)
- [Expo Config Plugins](https://docs.expo.dev/guides/config-plugins/)

## Credits

Implementation by expo-targets team following the established patterns from iOS share extensions and Android widget support.
