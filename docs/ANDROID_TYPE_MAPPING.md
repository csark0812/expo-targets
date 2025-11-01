# iOS to Android Type Mapping

Complete mapping of iOS extension types to their Android equivalents for the expo-targets Android implementation.

---

## Table of Contents

- [Overview](#overview)
- [Core Widget Types](#core-widget-types)
- [Extension Types](#extension-types)
- [System Integration](#system-integration)
- [Data Storage](#data-storage)
- [Build System](#build-system)
- [Framework Mapping](#framework-mapping)
- [Configuration](#configuration)
- [Manifest & Permissions](#manifest--permissions)

---

## Overview

This document provides a comprehensive mapping between iOS extension types and their Android equivalents. Each mapping includes:

- **iOS Type**: The original extension type
- **Android Equivalent**: The corresponding Android technology
- **API Level**: Minimum Android API level required
- **Implementation Complexity**: Difficulty level (Low/Medium/High)
- **Notes**: Key differences and considerations

---

## Core Widget Types

### 1. Widget (`widget`)

| iOS | Android |
|-----|---------|
| **Technology** | WidgetKit (iOS 14+) | Glance API (Android 13+) / AppWidgets (Android 12L-) |
| **Entry Point** | `Widget` struct with `WidgetConfiguration` | `GlanceAppWidget` class or `AppWidgetProvider` |
| **UI Framework** | SwiftUI | Jetpack Compose for Glance / RemoteViews for AppWidget |
| **Timeline** | `TimelineProvider` with entries | `updateAll()` / `updateIf()` for Glance |
| **Min Version** | iOS 14.0 | API 26 (Android 8.0) / API 33 (Android 13) for Glance |
| **Deployment Target** | `14.0` | `26` (targetSdk: 33+ recommended) |
| **Manifest Entry** | NSExtension point identifier | `<receiver>` with `android.appwidget.action.APPWIDGET_UPDATE` |

**Decision**: Support **both** Glance (modern) and AppWidget (legacy) with automatic detection based on target SDK and Android version.

**Key Differences**:
- iOS: Single widget configuration with multiple families (small/medium/large)
- Android: Separate widget definitions per size in `res/xml/`
- iOS: Timeline-based updates with automatic scheduling
- Android: Manual update triggers via `updateAll()` or periodic updates via `android:updatePeriodMillis`
- iOS: SwiftUI declarative UI
- Android: Jetpack Compose (Glance) or RemoteViews (legacy)

**Implementation Strategy**:
```kotlin
// Modern approach (Glance)
class WeatherWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Jetpack Compose UI
    }
}

// Legacy fallback (AppWidget)
class WeatherWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        // RemoteViews UI
    }
}
```

---

## Extension Types

### 2. App Clip (`clip`)

| iOS | Android |
|-----|---------|
| **Technology** | App Clips (iOS 14+) | Google Play Instant Apps |
| **Entry Point** | Separate target with `NSAppClip` plist key | Instant-enabled activity in manifest |
| **Size Limit** | 10 MB (compressed) | 10-15 MB per instant-enabled module |
| **Min Version** | iOS 14.0 | API 23 (Android 6.0) |
| **Deployment Target** | `14.0` | `23` |
| **Manifest Entry** | App Clip specific Info.plist | `android:targetSandboxVersion="2"` + instant enable flag |

**Decision**: Map to **Google Play Instant Apps** with dynamic feature module.

**Key Differences**:
- iOS: Completely separate target with own bundle
- Android: Dynamic feature module that can be instant-enabled
- iOS: Automatic App Clip card in Safari/Messages
- Android: Requires Google Play store integration
- iOS: Native App Clip experience API
- Android: Standard activity with instant context

**Implementation Strategy**:
```kotlin
// Instant-enabled activity
<activity
    android:name=".ClipActivity"
    android:exported="true">
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https"
              android:host="example.com" />
    </intent-filter>
</activity>
```

### 3. iMessage Stickers (`imessage`)

| iOS | Android |
|-----|---------|
| **Technology** | iMessage App Extension | **No Direct Equivalent** |
| **Alternative** | Messages Framework | Share to messaging apps / Sticker packs in Play Store |
| **Min Version** | iOS 10.0 | N/A |

**Decision**: **NOT SUPPORTED** - iMessage is iOS-specific. Alternative: Create shareable sticker content that can be shared to any messaging app.

**Note**: Android doesn't have a system-wide sticker API. Apps like WhatsApp, Telegram have their own sticker APIs.

### 4. Share Extension (`share`)

| iOS | Android |
|-----|---------|
| **Technology** | Share Extension (iOS 8+) | Share Target (Android 6+) |
| **Entry Point** | Extension with share service point | Activity with `ACTION_SEND` intent filter |
| **UI** | Can use React Native if enabled | Standard Activity (can use React Native) |
| **Min Version** | iOS 8.0 | API 23 (Android 6.0) |
| **Deployment Target** | `8.0` | `23` |
| **Manifest Entry** | `com.apple.share-services` | `<intent-filter>` with `ACTION_SEND` |

**Decision**: Map to **Share Target Activity** with full React Native support.

**Key Differences**:
- iOS: Extension context with limited lifecycle
- Android: Full activity with standard lifecycle
- iOS: NSExtensionItem for shared content
- Android: Intent extras for shared content

**Implementation Strategy**:
```kotlin
<activity android:name=".ShareActivity">
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="text/*" />
        <data android:mimeType="image/*" />
    </intent-filter>
</activity>
```

### 5. Action Extension (`action`)

| iOS | Android |
|-----|---------|
| **Technology** | Action Extension (iOS 8+) | Text Processing / Custom Actions |
| **Entry Point** | Extension with services point | Activity with custom action filter |
| **Min Version** | iOS 8.0 | API 23 (Android 6.0) |
| **Deployment Target** | `8.0` | `23` |

**Decision**: Map to **Custom Intent Filter Activity** (similar to share but with specific actions).

### 6. Notification Content Extension (`notification-content`)

| iOS | Android |
|-----|---------|
| **Technology** | UNNotificationContentExtension (iOS 10+) | Custom Notification Layout |
| **Entry Point** | Extension for custom notification UI | RemoteViews in notification builder |
| **Min Version** | iOS 10.0 | API 24 (Android 7.0) |
| **Deployment Target** | `10.0` | `24` |

**Decision**: Map to **Custom Notification Layouts** using RemoteViews (no separate module needed).

**Key Differences**:
- iOS: Separate extension target
- Android: Custom layout defined in main app
- iOS: Interactive notification UI with SwiftUI
- Android: RemoteViews with limited interactivity

### 7. Notification Service Extension (`notification-service`)

| iOS | Android |
|-----|---------|
| **Technology** | UNNotificationServiceExtension (iOS 10+) | FirebaseMessagingService |
| **Entry Point** | Extension to modify notification content | Service that handles FCM messages |
| **Min Version** | iOS 10.0 | API 14+ |
| **Deployment Target** | `10.0` | `14` |

**Decision**: Map to **FirebaseMessagingService** override (no separate module needed).

**Implementation Strategy**:
```kotlin
class CustomMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        // Modify notification before display
    }
}
```

### 8. Intents / Siri Shortcuts (`intent`, `intent-ui`)

| iOS | Android |
|-----|---------|
| **Technology** | Intents Extension (iOS 12+) | App Shortcuts / Direct Share |
| **Entry Point** | INExtension / INUIExtension | shortcuts.xml resource |
| **Min Version** | iOS 12.0 | API 25 (Android 7.1) for shortcuts |
| **Deployment Target** | `12.0` | `25` |

**Decision**: Map to **App Shortcuts API** and **Direct Share**.

**Key Differences**:
- iOS: Requires extension for custom UI
- Android: Declarative XML or dynamic shortcuts API
- iOS: INIntent framework
- Android: ShortcutManager API

### 9. Live Activities / Control Center (`app-intent`)

| iOS | Android |
|-----|---------|
| **Technology** | App Intents Extension (iOS 16+) | **No Direct Equivalent** |
| **Alternative** | ActivityKit for Live Activities | Ongoing Notifications / Foreground Services |
| **Min Version** | iOS 16.0 | API 26+ for notification channels |

**Decision**: Map Live Activities to **Ongoing Notifications**, Control Center widgets to **Quick Settings Tiles**.

**Implementation Strategy**:
```kotlin
// Quick Settings Tile
class CustomTileService : TileService() {
    override fun onClick() {
        // Handle tile click
    }
}
```

### 10. Safari Extension (`safari`)

| iOS | Android |
|-----|---------|
| **Technology** | Safari Web Extension (iOS 15+) | **No System Equivalent** |
| **Alternative** | WebExtensions API | Chrome Custom Tabs / WebView injection |

**Decision**: **NOT SUPPORTED** - Safari extensions are iOS-specific. Android browsers don't have a unified extension API.

### 11. Watch App (`watch`)

| iOS | Android |
|-----|---------|
| **Technology** | watchOS App | Wear OS App |
| **Entry Point** | Separate WatchKit target | Separate Wear module |
| **Min Version** | watchOS 2.0+ | Wear OS 2.0+ (API 23+) |

**Decision**: Map to **Wear OS Module** with separate gradle configuration.

### 12. Background Asset Downloader (`bg-download`)

| iOS | Android |
|-----|---------|
| **Technology** | Background Asset Downloader (iOS 7+) | WorkManager (Jetpack) |
| **Entry Point** | Extension with download point | Worker class |
| **Min Version** | iOS 7.0 | API 14+ |

**Decision**: Map to **WorkManager** with constraints for network/battery.

**Implementation Strategy**:
```kotlin
class DownloadWorker(context: Context, params: WorkerParameters) 
    : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        // Download logic
        return Result.success()
    }
}
```

---

## System Integration

### UserDefaults (iOS) → SharedPreferences (Android)

| iOS | Android |
|-----|---------|
| **Storage API** | `UserDefaults(suiteName:)` | `Context.getSharedPreferences()` |
| **Shared Access** | App Groups | Same app signature + MODE_PRIVATE |
| **Sync** | `.synchronize()` (deprecated, automatic) | `.apply()` or `.commit()` |

**Decision**: Use **SharedPreferences** with content URI sharing for cross-process access.

**Key Differences**:
- iOS: App Groups require entitlements and developer portal configuration
- Android: Shared preferences are automatically accessible to all components in the same app
- iOS: Requires explicit App Group ID
- Android: Automatic based on package name

**Implementation**:
```kotlin
// Main app
val prefs = context.getSharedPreferences("expo_targets", Context.MODE_PRIVATE)
prefs.edit().putString("key", "value").apply()

// Widget can access same preferences
val prefs = context.getSharedPreferences("expo_targets", Context.MODE_PRIVATE)
val value = prefs.getString("key", null)
```

### WidgetCenter (iOS) → AppWidgetManager (Android)

| iOS | Android |
|-----|---------|
| **Refresh API** | `WidgetCenter.shared.reloadTimelines(ofKind:)` | `AppWidgetManager.updateAppWidget()` / Glance `updateAll()` |
| **Timing** | Timeline-based with policy | Manual or periodic (`updatePeriodMillis`) |

**Decision**: Wrap both `AppWidgetManager` and Glance `updateAll()` in unified API.

**Implementation**:
```kotlin
// Unified refresh API
object TargetManager {
    fun refreshTarget(context: Context, targetName: String) {
        // Glance widgets
        GlanceAppWidget.update(context, targetName)
        
        // Legacy AppWidgets
        val ids = AppWidgetManager.getInstance(context)
            .getAppWidgetIds(ComponentName(context, targetName))
        AppWidgetManager.getInstance(context)
            .notifyAppWidgetViewDataChanged(ids, R.id.list_view)
    }
}
```

---

## Data Storage

### Storage Mechanism Mapping

| iOS | Android | Notes |
|-----|---------|-------|
| UserDefaults | SharedPreferences | Key-value storage |
| App Groups | Shared UID / Content Provider | Cross-process sharing |
| FileManager (App Group) | Internal Storage + Content Provider | File sharing |
| Keychain (shared) | EncryptedSharedPreferences | Secure storage |

**Decision**: 
- Use **SharedPreferences** for simple key-value data (same as UserDefaults)
- Use **EncryptedSharedPreferences** for sensitive data
- Use **Content Provider** for complex cross-process data sharing if needed

**Storage Path Comparison**:
```
iOS:
~/Library/Group Containers/group.com.example.app/
└─ Library/Preferences/group.com.example.app.plist

Android:
/data/data/com.example.app/shared_prefs/
└─ expo_targets.xml
```

---

## Build System

### Project Structure

| iOS | Android |
|-----|---------|
| **Build System** | Xcode (.xcodeproj) | Gradle (build.gradle) |
| **Target** | PBXNativeTarget in xcodeproj | Separate module or product flavor |
| **Manifest** | Info.plist | AndroidManifest.xml |
| **Resources** | Assets.xcassets | res/ directory |
| **Dependencies** | CocoaPods (Podfile) | Gradle dependencies |

**Decision**: 
- Create **separate Gradle modules** for true extensions (widgets)
- Use **product flavors** or **build variants** for different widget types
- Generate **AndroidManifest.xml** entries dynamically

### Build Configuration

| iOS (Xcode) | Android (Gradle) |
|-------------|------------------|
| `PRODUCT_BUNDLE_IDENTIFIER` | `applicationId` |
| `IPHONEOS_DEPLOYMENT_TARGET` | `minSdkVersion` |
| `SWIFT_VERSION` | `kotlinOptions.jvmTarget` |
| Build Configuration (Debug/Release) | Build Types (debug/release) |
| Framework linking | dependencies { implementation } |

**Decision**: Generate Gradle configuration in `settings.gradle` and module `build.gradle`.

---

## Framework Mapping

### iOS Frameworks → Android Dependencies

| iOS Framework | Android Equivalent | Gradle Dependency |
|---------------|-------------------|-------------------|
| WidgetKit | Glance / AppWidget | androidx.glance:glance-appwidget |
| SwiftUI | Jetpack Compose | androidx.compose.ui:ui |
| ActivityKit | Ongoing Notifications | androidx.core:core |
| AppIntents | App Shortcuts | androidx.core:core-google-shortcuts |
| UserNotifications | NotificationManager | androidx.core:core |
| Messages | N/A (iOS only) | - |

**Common Dependencies for Widgets**:
```gradle
dependencies {
    implementation 'androidx.glance:glance-appwidget:1.0.0'
    implementation 'androidx.compose.runtime:runtime:1.5.0'
    implementation 'androidx.datastore:datastore-preferences:1.0.0'
}
```

---

## Configuration

### expo-target.config.json Structure

**Current (iOS only)**:
```json
{
  "type": "widget",
  "name": "WeatherWidget",
  "displayName": "Weather",
  "platforms": ["ios"],
  "appGroup": "group.com.test.widgetinteractive",
  "ios": {
    "deploymentTarget": "17.0",
    "bundleIdentifier": "com.test.widgetinteractive.weather",
    "displayName": "Weather Widget",
    "colors": { ... }
  }
}
```

**Proposed (iOS + Android)**:
```json
{
  "type": "widget",
  "name": "WeatherWidget",
  "displayName": "Weather",
  "platforms": ["ios", "android"],
  "appGroup": "group.com.test.widgetinteractive",
  "ios": { ... },
  "android": {
    "minSdkVersion": 26,
    "targetSdkVersion": 34,
    "packageName": "com.test.widgetinteractive.weather",
    "displayName": "Weather Widget",
    "colors": {
      "accentColor": "#007AFF",
      "backgroundColor": "#FFFFFF"
    },
    "updatePeriodMillis": 1800000,
    "resizeMode": "horizontal|vertical",
    "widgetCategory": "home_screen",
    "previewImage": "@drawable/widget_preview",
    "useGlance": true
  }
}
```

### Android-Specific Configuration Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `minSdkVersion` | number | Minimum Android API level | 26 |
| `targetSdkVersion` | number | Target Android API level | 34 |
| `packageName` | string | Widget's resource name | `{mainPackage}.{name}` |
| `displayName` | string | Widget display name | Same as `name` |
| `colors` | object | Color resources | {} |
| `updatePeriodMillis` | number | Update interval (ms, legacy widgets) | 1800000 (30 min) |
| `resizeMode` | string | horizontal\|vertical\|none | "horizontal\|vertical" |
| `widgetCategory` | string | home_screen\|keyguard | "home_screen" |
| `previewImage` | string | Preview resource | null |
| `useGlance` | boolean | Use Glance API vs AppWidget | true (if SDK 33+) |
| `permissions` | string[] | Required Android permissions | [] |

---

## Manifest & Permissions

### iOS Entitlements → Android Permissions

| iOS Entitlement | Android Permission | Manifest Declaration |
|-----------------|-------------------|----------------------|
| App Groups | None (same-app access) | - |
| Notifications | POST_NOTIFICATIONS (API 33+) | `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />` |
| Location | ACCESS_FINE_LOCATION | `<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />` |
| Network | INTERNET | `<uses-permission android:name="android.permission.INTERNET" />` |
| Background | FOREGROUND_SERVICE | `<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />` |

### Widget Manifest Entry

**iOS Info.plist**:
```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
</dict>
```

**Android AndroidManifest.xml**:
```xml
<receiver
    android:name=".WeatherWidget"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/weather_widget_info" />
</receiver>
```

**Widget Info XML** (`res/xml/weather_widget_info.xml`):
```xml
<appwidget-provider
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:updatePeriodMillis="1800000"
    android:previewImage="@drawable/preview"
    android:initialLayout="@layout/weather_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
```

---

## Implementation Priority

Based on complexity and usage, here's the recommended implementation order:

### Phase 1: Core Widget Support (MVP)
1. ✅ **Widget** (`widget`) - Glance API for modern widgets
2. ✅ **Data Storage** - SharedPreferences wrapper
3. ✅ **Refresh API** - AppWidgetManager integration

### Phase 2: React Native Extensions
4. ✅ **Share Extension** (`share`) - Share Target Activity
5. ✅ **Action Extension** (`action`) - Custom intent filters
6. ✅ **App Clip** (`clip`) - Instant Apps integration

### Phase 3: Advanced Features
7. **Notification Extensions** (`notification-content`, `notification-service`)
8. **Background Tasks** (`bg-download`)
9. **Intents** (`intent`, `intent-ui`) - App Shortcuts

### Phase 4: Platform-Specific (Lower Priority)
10. **Watch App** (`watch`) - Wear OS
11. **Quick Settings** - Control Center equivalent
12. **Live Activities** - Ongoing Notifications

### Not Supported
- ❌ iMessage Extensions (iOS-only)
- ❌ Safari Extensions (iOS-only)

---

## Summary

This mapping provides the foundation for Android implementation:

1. **Widgets**: Use Glance API (modern) with AppWidget fallback (legacy)
2. **Storage**: SharedPreferences mirrors UserDefaults behavior
3. **Extensions**: Map to Android Activities with intent filters
4. **Build**: Gradle modules with generated configuration
5. **Manifest**: Auto-generate receiver/activity declarations

The architecture maintains API parity where possible while respecting platform differences. Each type has been carefully evaluated for Android equivalence and implementation strategy.

---

## Next Steps

See [ANDROID_IMPLEMENTATION_PLAN.md](./ANDROID_IMPLEMENTATION_PLAN.md) for detailed implementation strategy.
