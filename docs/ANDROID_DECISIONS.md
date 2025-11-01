# Android Implementation Decision Document

Comprehensive documentation of every decision made for the Android implementation of expo-targets, with detailed rationale and alternatives considered.

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Core Architecture Decisions](#core-architecture-decisions)
- [Widget Implementation Decisions](#widget-implementation-decisions)
- [Data Storage Decisions](#data-storage-decisions)
- [Build System Decisions](#build-system-decisions)
- [API Design Decisions](#api-design-decisions)
- [Code Generation Decisions](#code-generation-decisions)
- [Configuration Decisions](#configuration-decisions)
- [Platform Parity Decisions](#platform-parity-decisions)
- [Testing & Quality Decisions](#testing--quality-decisions)
- [Future-Proofing Decisions](#future-proofing-decisions)

---

## Executive Summary

The Android implementation of expo-targets aims to provide feature parity with iOS while respecting Android platform conventions and best practices. Every decision prioritizes:

1. **Developer Experience**: Consistent API across platforms
2. **Platform Native**: Use Android best practices (Gradle, Kotlin, Jetpack)
3. **Type Safety**: Full type checking in TypeScript and Kotlin
4. **Maintainability**: Clear, well-documented code generation
5. **Performance**: Efficient data sharing and widget updates

---

## Core Architecture Decisions

### Decision 1: Separate Gradle Modules for Each Widget

**Decision**: Create each widget/extension as a separate Gradle module (e.g., `android/WeatherWidget/`)

**Rationale**:
- **Mirrors iOS Architecture**: iOS creates separate Xcode targets; Android modules are the equivalent
- **Dependency Isolation**: Each widget has its own dependencies, avoiding bloat
- **Build Flexibility**: Can build/test modules independently
- **Code Organization**: Clear separation of concerns
- **React Native Compatibility**: Easier to include/exclude RN per module

**Alternatives Considered**:
1. **Single Module with Multiple Receivers**: 
   - ❌ Pros: Simpler build setup
   - ❌ Cons: All widgets share dependencies, harder to manage, doesn't mirror iOS
   
2. **Product Flavors**: 
   - ❌ Pros: Built-in Gradle feature
   - ❌ Cons: Flavors are for app variants, not for extensions; confusing mental model

3. **Dynamic Feature Modules**: 
   - ❌ Pros: Can be downloaded on-demand
   - ❌ Cons: Overkill for widgets, requires Play Store, adds complexity

**Implementation**: Each target gets its own module in `android/{TargetName}/` with `build.gradle`, manifest, and source.

---

### Decision 2: Glance API (Modern) with AppWidget Fallback (Legacy)

**Decision**: Use Jetpack Glance API by default (Android 13+), with optional AppWidget fallback (Android 8+)

**Rationale**:
- **Modern Best Practice**: Glance is Google's recommended approach (released 2022)
- **Declarative UI**: Uses Jetpack Compose, similar to SwiftUI paradigm
- **Better DX**: More intuitive than RemoteViews XML
- **Feature Parity**: Glance features align better with WidgetKit
- **Future-Proof**: Google is investing in Glance, not AppWidget

**Alternatives Considered**:
1. **Only Legacy AppWidget**: 
   - ❌ Pros: Works on older devices (API 8+)
   - ❌ Cons: RemoteViews is clunky, XML layouts are painful, no Compose

2. **Only Glance**: 
   - ❌ Pros: Simplest implementation
   - ❌ Cons: Requires API 26+ (Android 8.0), excludes older devices

3. **Dual Implementation (Both)**: 
   - ✅ **CHOSEN** Pros: Best of both worlds, automatic selection based on SDK
   - ⚠️ Cons: More code to maintain, but manageable with config flag

**Implementation**: 
```json
{
  "android": {
    "useGlance": true,  // Auto-detects based on targetSdk, user can override
    "minSdkVersion": 26  // 26 for Glance, 23 for legacy AppWidget
  }
}
```

**Selection Logic**:
```kotlin
// Plugin auto-selects based on config
if (targetSdkVersion >= 33 && useGlance !== false) {
  generateGlanceWidget();
} else {
  generateAppWidgetProvider();
}
```

---

### Decision 3: SharedPreferences Instead of App Groups

**Decision**: Use `SharedPreferences` with `MODE_PRIVATE` for data sharing between app and widgets

**Rationale**:
- **Same-App Access**: Widgets run in same process/UID as main app, can access same SharedPreferences
- **Simple API**: Direct equivalent to iOS `UserDefaults`
- **No Extra Setup**: No need for Content Provider or special permissions
- **Performance**: In-memory cache, fast reads
- **Sync Guaranteed**: Same filesystem, atomic operations

**iOS Comparison**:
```swift
// iOS: App Groups required for separate processes
let defaults = UserDefaults(suiteName: "group.com.example.app")
defaults?.set(value, forKey: key)
```

```kotlin
// Android: Same app, direct access
val prefs = context.getSharedPreferences("expo_targets", Context.MODE_PRIVATE)
prefs.edit().putString(key, value).apply()
```

**Alternatives Considered**:
1. **Content Provider**: 
   - ❌ Pros: Can share across apps
   - ❌ Cons: Overkill for same-app sharing, requires URI permissions, slower

2. **DataStore (Jetpack)**: 
   - ⚠️ Pros: Modern, async, type-safe
   - ❌ Cons: Flow-based (complex for simple get/set), not a 1:1 UserDefaults match

3. **SQLite Database**: 
   - ❌ Pros: Structured data
   - ❌ Cons: Way too heavy for key-value storage, poor API match

4. **File-Based Storage**: 
   - ❌ Pros: Full control
   - ❌ Cons: Must handle locking, caching, serialization manually

**Decision Outcome**: SharedPreferences is the clear winner for API parity and simplicity.

---

## Widget Implementation Decisions

### Decision 4: Kotlin as Primary Language

**Decision**: Use Kotlin for all generated and example Android code

**Rationale**:
- **Modern Standard**: Kotlin is Google's preferred language for Android (since 2019)
- **Null Safety**: Built-in null safety reduces crashes
- **Concise Syntax**: Less boilerplate than Java
- **Coroutines**: Better async handling (important for Glance)
- **Compose Native**: Jetpack Compose is designed for Kotlin
- **Community Standard**: 80%+ of new Android code is Kotlin

**Alternatives Considered**:
1. **Java**: 
   - ❌ Pros: More universal, older developers familiar
   - ❌ Cons: Verbose, no null safety, not recommended by Google

2. **Mixed Kotlin/Java**: 
   - ❌ Pros: Flexibility
   - ❌ Cons: Confusing, inconsistent codebase

**Implementation**: All generated code, examples, and documentation use Kotlin exclusively.

---

### Decision 5: Jetpack Compose for Widget UI

**Decision**: Use Jetpack Compose (via Glance) for widget UI instead of XML layouts

**Rationale**:
- **Declarative Paradigm**: Matches SwiftUI on iOS (declarative > imperative)
- **Code Reuse**: Compose knowledge transfers to app development
- **Type Safety**: Compile-time checks for UI
- **Hot Reload**: Faster iteration (in Android Studio)
- **Modern**: Google's current direction for Android UI

**Comparison to iOS**:

**iOS (SwiftUI)**:
```swift
VStack {
    Text(data.emoji)
        .font(.system(size: 48))
    Text(data.temperatureFormatted)
        .font(.system(size: 36, weight: .bold))
}
```

**Android (Glance Compose)**:
```kotlin
Column {
    Text(
        text = data.emoji,
        style = TextStyle(fontSize = 48.sp)
    )
    Text(
        text = data.temperatureFormatted,
        style = TextStyle(fontSize = 36.sp, fontWeight = FontWeight.Bold)
    )
}
```

**Alternatives Considered**:
1. **XML Layouts (Legacy)**: 
   - ❌ Pros: Works on all Android versions
   - ❌ Cons: Verbose, not declarative, poor DX, RemoteViews limitations

2. **Programmatic RemoteViews**: 
   - ❌ Pros: No XML files
   - ❌ Cons: Still imperative, limited view types, painful to maintain

**Decision Outcome**: Compose via Glance provides the best DX and closest match to iOS SwiftUI.

---

### Decision 6: Size-Based Layout Selection

**Decision**: Implement responsive layouts that adapt based on widget size (small/medium/large)

**Rationale**:
- **Matches iOS**: iOS has widget families (systemSmall, systemMedium, systemLarge)
- **Better UX**: Different information density for different sizes
- **Android Best Practice**: Widgets should be responsive to size changes
- **User Expectation**: Users expect large widgets to show more info

**Implementation**:
```kotlin
@Composable
fun WeatherWidgetView(data: WeatherData?) {
    val size = LocalSize.current
    
    when {
        size.width.value < 200 -> SmallWidgetView(data)
        size.width.value < 300 -> MediumWidgetView(data)
        else -> LargeWidgetView(data)
    }
}
```

**iOS Comparison**:
```swift
struct WeatherWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WeatherWidgetView(entry: entry)
        }
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
```

**Alternatives Considered**:
1. **Single Layout for All Sizes**: 
   - ❌ Pros: Simpler
   - ❌ Cons: Poor UX, wastes space on large widgets

2. **Separate Widget Configurations**: 
   - ❌ Pros: Maximum control
   - ❌ Cons: User sees multiple widgets in picker (confusing)

**Decision Outcome**: Single widget with responsive layouts provides best UX and matches iOS.

---

## Data Storage Decisions

### Decision 7: JSON Serialization for Complex Data

**Decision**: Use JSON serialization (kotlinx.serialization) for object storage, matching iOS approach

**Rationale**:
- **API Parity**: iOS uses `JSONEncoder`/`JSONDecoder`, Android should match
- **Type Safety**: Kotlin serialization provides compile-time checks
- **Cross-Platform**: JSON is universal, works if we add web support
- **Debugging**: Human-readable format
- **Flexibility**: Easy to version and migrate

**iOS Implementation**:
```swift
// iOS: JSON encoding
let jsonData = try? JSONEncoder().encode(weatherData)
let jsonString = String(data: jsonData, encoding: .utf8)
defaults.set(jsonString, forKey: "weather")
```

**Android Implementation**:
```kotlin
// Android: JSON serialization (mirrors iOS)
val jsonString = Json.encodeToString(weatherData)
prefs.edit().putString("weather", jsonString).apply()
```

**Alternatives Considered**:
1. **Parcelable**: 
   - ❌ Pros: Android-specific, efficient binary format
   - ❌ Cons: Not cross-platform, not human-readable, iOS doesn't have equivalent

2. **Protocol Buffers**: 
   - ❌ Pros: Efficient, versioned
   - ❌ Cons: Overkill, adds complexity, schema required

3. **Raw Data Types**: 
   - ❌ Pros: Simple
   - ❌ Cons: Can't store objects, loses type information

**Decision Outcome**: JSON provides best balance of simplicity, debuggability, and cross-platform consistency.

---

### Decision 8: Synchronous Storage API

**Decision**: Use synchronous storage operations (`.apply()` not `.commit()`, but immediate reads)

**Rationale**:
- **API Parity**: iOS UserDefaults is synchronous, Android should match
- **Simplicity**: No promises/callbacks needed
- **Widget Context**: Widgets typically read data once per update, not performance-critical
- **Crash Safety**: `.apply()` writes asynchronously to disk but returns immediately

**Implementation**:
```typescript
// TypeScript API (same for iOS and Android)
weatherWidget.set('weather', data);  // Synchronous
const data = weatherWidget.get('weather');  // Synchronous
```

```kotlin
// Android native (synchronous appearance)
prefs.edit().putString(key, value).apply()  // Returns immediately, writes async
val value = prefs.getString(key, null)  // Immediate read from memory
```

**Alternatives Considered**:
1. **Fully Asynchronous (suspend functions)**: 
   - ❌ Pros: Non-blocking
   - ❌ Cons: Different API than iOS, more complex for users, not needed for small data

2. **DataStore (Flow-based)**: 
   - ❌ Pros: Modern, reactive
   - ❌ Cons: Flow learning curve, overkill, doesn't match iOS API

**Decision Outcome**: Synchronous API matches iOS and is sufficient for widget use case.

---

## Build System Decisions

### Decision 9: Gradle Module Generation

**Decision**: Auto-generate complete Gradle modules during `expo prebuild`, including `build.gradle`, manifest, and resource directories

**Rationale**:
- **Mirrors iOS**: iOS generates Xcode targets during prebuild; Android should generate Gradle modules
- **Declarative**: User defines config in JSON, plugin generates everything
- **No Manual Setup**: Zero Gradle knowledge required
- **Idempotent**: Running prebuild multiple times produces same result
- **Version Control**: Generated files in `android/` are gitignored (like `ios/`)

**Generated Structure**:
```
android/
├── settings.gradle           # Modified: includes new modules
└── WeatherWidget/            # Generated module
    ├── build.gradle          # Generated
    ├── src/main/
    │   ├── AndroidManifest.xml  # Generated
    │   ├── kotlin/...        # Copied from targets/.../android/
    │   └── res/              # Generated resources
    └── .gitignore
```

**Alternatives Considered**:
1. **Manual Gradle Setup**: 
   - ❌ Pros: Full control for advanced users
   - ❌ Cons: Poor DX, error-prone, doesn't match iOS experience

2. **Gradle Plugin**: 
   - ❌ Pros: Gradle-native
   - ❌ Cons: Harder to maintain, doesn't integrate with Expo prebuild flow

3. **Template Copying**: 
   - ❌ Pros: Simple
   - ❌ Cons: Hard to update, version conflicts, user modifications lost on rebuild

**Decision Outcome**: Code generation provides best DX and matches Expo's prebuild pattern.

---

### Decision 10: Include in settings.gradle

**Decision**: Modify `settings.gradle` to include widget modules, rather than using separate `build.gradle` includes

**Rationale**:
- **Gradle Standard**: `settings.gradle` is the proper place for module declarations
- **Project Structure**: Makes modules discoverable by Android Studio
- **Build Performance**: Gradle can optimize parallel builds
- **IDE Support**: Android Studio recognizes modules for navigation

**Generated Code**:
```gradle
// android/settings.gradle
include ':app'
include ':WeatherWidget'
project(':WeatherWidget').projectDir = new File(rootProject.projectDir, 'WeatherWidget')
```

**Alternatives Considered**:
1. **Dynamic Includes in App build.gradle**: 
   - ❌ Pros: Single file modification
   - ❌ Cons: Not standard Gradle practice, harder to debug

2. **Separate Project**: 
   - ❌ Cons: Each widget is a separate Gradle project
   - ❌ Cons: Complex, doesn't match iOS, poor IDE experience

**Decision Outcome**: Standard Gradle module inclusion is the right choice.

---

### Decision 11: Dependency Management

**Decision**: Widget modules declare `implementation project(':app')` to access main app code, plus their own specific dependencies

**Rationale**:
- **Code Reuse**: Widgets can import shared code from main app
- **Dependency Control**: Each widget only includes what it needs
- **Build Optimization**: Gradle handles transitive dependencies
- **Version Consistency**: All modules use same library versions

**Example `build.gradle`**:
```gradle
dependencies {
    implementation project(':app')  // Access to main app code
    
    // Widget-specific dependencies
    implementation 'androidx.glance:glance-appwidget:1.0.0'
    implementation 'androidx.compose.runtime:runtime:1.5.4'
}
```

**Alternatives Considered**:
1. **Duplicate Dependencies**: 
   - ❌ Pros: Full independence
   - ❌ Cons: Version conflicts, bloat, maintenance nightmare

2. **No App Dependency**: 
   - ❌ Pros: Completely isolated
   - ❌ Cons: Can't share code, defeats purpose of monorepo

**Decision Outcome**: Project dependency on `:app` provides right balance.

---

## API Design Decisions

### Decision 12: Unified TypeScript API

**Decision**: Same TypeScript API works on both iOS and Android, with platform detection handled internally

**Rationale**:
- **Developer Experience**: Write once, run on both platforms
- **Reduced Errors**: No platform-specific APIs to remember
- **Easier Migration**: Existing iOS code works on Android immediately
- **Mental Model**: Matches React Native philosophy

**Implementation**:
```typescript
// targets/weather-widget/index.ts
import { createTarget } from 'expo-targets';

// Same API for iOS and Android
export const weatherWidget = createTarget('WeatherWidget');

// Works on both platforms
export const updateWeather = async (data: WeatherData) => {
  await weatherWidget.set('weather', data);  // iOS: UserDefaults, Android: SharedPreferences
  weatherWidget.refresh();  // iOS: WidgetCenter, Android: AppWidgetManager
};
```

**Platform Detection** (internal):
```typescript
// packages/expo-targets/src/TargetStorageModule.ts
import { Platform } from 'react-native';

export default Platform.select({
  ios: () => require('./TargetStorageModule.ios').default,
  android: () => require('./TargetStorageModule.android').default,
})();
```

**Alternatives Considered**:
1. **Separate Platform APIs**: 
   - ❌ Pros: Maximum platform optimization
   - ❌ Cons: Confusing, requires platform checks everywhere, poor DX

2. **Platform-Specific Packages**: 
   - ❌ Pros: Clear separation
   - ❌ Cons: Import hell, version management nightmare

**Decision Outcome**: Unified API with internal platform detection is cleanest.

---

### Decision 13: Native Module Implementation

**Decision**: Implement Android native module in Kotlin using Expo Modules API

**Rationale**:
- **Consistency**: iOS uses ExpoModulesCore, Android should match
- **Auto-Generated Bindings**: Expo Modules handles TypeScript ↔ Kotlin bridging
- **Type Safety**: Compile-time checks on both sides
- **Maintenance**: Single API pattern for both platforms
- **Future-Proof**: Expo's recommended approach for native modules

**Implementation**:
```kotlin
// packages/expo-targets/android/.../ExpoTargetsModule.kt
class ExpoTargetsModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoTargets")
        
        Function("setString") { key: String, value: String, group: String? ->
            getPreferences(group).edit().putString(key, value).apply()
        }
        
        Function("get") { key: String, group: String? ->
            getPreferences(group).getString(key, null)
        }
        
        Function("refreshTarget") { name: String? ->
            refreshWidgets(name)
        }
    }
}
```

**Alternatives Considered**:
1. **React Native TurboModules**: 
   - ❌ Pros: Facebook's new architecture
   - ❌ Cons: Still in beta, not stable, different from iOS

2. **Manual Bridge**: 
   - ❌ Pros: Full control
   - ❌ Cons: Tons of boilerplate, type safety lost, hard to maintain

3. **Native Android API Only**: 
   - ❌ Pros: No JS bridge needed
   - ❌ Cons: Can't call from React Native app, defeats purpose

**Decision Outcome**: Expo Modules provides best integration with existing iOS code.

---

## Code Generation Decisions

### Decision 14: Template-Based Code Generation

**Decision**: Use template strings for generating Kotlin, Gradle, XML, with placeholders for config values

**Rationale**:
- **Simplicity**: Easy to read and maintain
- **Flexibility**: Can generate any structure
- **Debugging**: Generated files are human-readable
- **Version Control**: Can diff generated files
- **No Dependencies**: No template engine required

**Example**:
```typescript
function generateBuildGradle(config: AndroidTargetConfig): string {
  return `
plugins {
    id 'com.android.library'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace '${config.packageName}'
    compileSdk ${config.targetSdkVersion}
    
    defaultConfig {
        minSdk ${config.minSdkVersion}
    }
}
`.trim();
}
```

**Alternatives Considered**:
1. **Handlebars/Mustache Templates**: 
   - ❌ Pros: More powerful syntax
   - ❌ Cons: Extra dependency, learning curve, overkill

2. **AST Manipulation (like Xcode)**: 
   - ❌ Pros: Surgical edits
   - ❌ Cons: Complex for Android (XML + Gradle), harder to debug

3. **Copy Template Files**: 
   - ❌ Pros: Visual reference
   - ❌ Cons: Hard to maintain, variable substitution clunky

**Decision Outcome**: Template strings strike perfect balance of simplicity and power.

---

### Decision 15: File Copying Strategy

**Decision**: Copy Kotlin source files from `targets/{name}/android/` to generated module during prebuild

**Rationale**:
- **Mirrors iOS**: iOS copies Swift files from `targets/{name}/ios/`
- **Source of Truth**: User's code stays in logical location (`targets/`)
- **Build Integration**: Generated module has all files in expected location
- **IDE Support**: Android Studio can navigate/edit files in module directory

**Flow**:
```
targets/weather-widget/android/
├── WeatherWidget.kt          (user writes here)
├── WeatherData.kt
└── WeatherWidgetView.kt

      ↓ (expo prebuild)

android/WeatherWidget/src/main/kotlin/.../
├── WeatherWidget.kt          (copied here for build)
├── WeatherData.kt
└── WeatherWidgetView.kt
```

**Alternatives Considered**:
1. **Symlinks**: 
   - ❌ Pros: No duplication
   - ❌ Cons: Windows support issues, Gradle sometimes follows symlinks poorly

2. **Source Sets Pointing to targets/**: 
   - ❌ Pros: Single source
   - ❌ Cons: Gradle expects source in module, IDEs confused, build issues

3. **Keep in targets/, no copy**: 
   - ❌ Pros: No duplication
   - ❌ Cons: Gradle can't find files, doesn't match iOS pattern

**Decision Outcome**: Copying files matches iOS behavior and ensures compatibility.

---

## Configuration Decisions

### Decision 16: Android Config Section in expo-target.config.json

**Decision**: Add `android` section to existing config file, parallel to `ios` section

**Rationale**:
- **Single Source of Truth**: One config file for all platforms
- **Easy Comparison**: Can see iOS vs Android settings side-by-side
- **Incremental Adoption**: Add `"android"` to existing iOS-only targets
- **Type Safety**: TypeScript ensures all required fields present

**Structure**:
```json
{
  "type": "widget",
  "name": "WeatherWidget",
  "platforms": ["ios", "android"],
  "ios": {
    "deploymentTarget": "17.0",
    "bundleIdentifier": "com.test.app.weather",
    "colors": { ... }
  },
  "android": {
    "minSdkVersion": 26,
    "targetSdkVersion": 34,
    "packageName": "com.test.app.weather",
    "colors": { ... }
  }
}
```

**Alternatives Considered**:
1. **Separate Files** (`expo-target.android.json`): 
   - ❌ Pros: Clear separation
   - ❌ Cons: Duplication, easy to forget to update both, poor DX

2. **Platform-Specific Directories**: 
   - ❌ Pros: Follows native conventions
   - ❌ Cons: Split config is confusing, doesn't match Expo pattern

3. **Single Flat Config** (no `ios`/`android` sections): 
   - ❌ Pros: Simpler
   - ❌ Cons: Platform-specific fields mixed, naming conflicts (e.g., `bundleIdentifier` vs `packageName`)

**Decision Outcome**: Nested platform sections provide clear organization and match Expo's app.json pattern.

---

### Decision 17: Color Naming Convention

**Decision**: Use snake_case for Android color names (iOS uses PascalCase), auto-convert during generation

**Rationale**:
- **Android Convention**: Android resources use snake_case (`@color/accent_color`)
- **XML Requirement**: Android XML parsers expect snake_case
- **Auto-Conversion**: Plugin converts iOS color names to Android format
- **Flexibility**: Users can specify either format in config

**Implementation**:
```json
{
  "ios": {
    "colors": {
      "AccentColor": { "light": "#007AFF", "dark": "#0A84FF" },
      "SunnyColor": { "light": "#FFB800" }
    }
  },
  "android": {
    "colors": {
      "accent_color": { "light": "#007AFF", "dark": "#0A84FF" },
      "sunny_color": { "light": "#FFB800" }
    }
  }
}
```

**Auto-Conversion**:
```typescript
function convertColorName(name: string): string {
  // AccentColor -> accent_color
  return name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}
```

**Alternatives Considered**:
1. **Force Same Names**: 
   - ❌ Pros: Consistency
   - ❌ Cons: Breaks Android conventions, confusing for Android devs

2. **No Conversion**: 
   - ❌ Pros: User controls everything
   - ❌ Cons: Easy to make mistakes, poor DX

**Decision Outcome**: Auto-conversion respects platform conventions while maintaining cross-platform config.

---

## Platform Parity Decisions

### Decision 18: Widget Refresh Mechanism

**Decision**: Implement `refresh()` method that calls `AppWidgetManager` on Android and `WidgetCenter` on iOS

**Rationale**:
- **API Consistency**: Same method name on both platforms
- **Immediate Updates**: Widgets update instantly after data change
- **User Expectation**: Matches iOS behavior where `refresh()` triggers timeline reload
- **Performance**: Only refreshes specific widget, not all

**Implementation**:

**iOS**:
```swift
WidgetCenter.shared.reloadTimelines(ofKind: targetName)
```

**Android**:
```kotlin
fun refreshTarget(context: Context, targetName: String) {
    // For Glance widgets
    runBlocking {
        GlanceAppWidget.update(context, ComponentName(context, targetName))
    }
    
    // For legacy AppWidgets
    val manager = AppWidgetManager.getInstance(context)
    val ids = manager.getAppWidgetIds(ComponentName(context, targetName))
    manager.notifyAppWidgetViewDataChanged(ids, android.R.id.list)
}
```

**Alternatives Considered**:
1. **Automatic Updates Only**: 
   - ❌ Pros: No user action needed
   - ❌ Cons: Can't force immediate update, not enough for real-time apps

2. **Platform-Specific Methods**: 
   - ❌ Pros: Maximum control
   - ❌ Cons: Different APIs, poor DX, platform checks everywhere

3. **No Refresh Method**: 
   - ❌ Pros: Simpler
   - ❌ Cons: Breaking change from iOS, user expectations not met

**Decision Outcome**: Unified `refresh()` method provides best cross-platform experience.

---

### Decision 19: Extension Type Parity

**Decision**: Support subset of iOS extension types on Android where equivalents exist, document unsupported types clearly

**Supported Types**:
- ✅ `widget` → Glance/AppWidget
- ✅ `share` → Share Target Activity
- ✅ `action` → Custom Action Activity
- ✅ `clip` → Instant Apps
- ✅ `notification-content` → Custom Notification Layouts
- ✅ `notification-service` → FirebaseMessagingService

**Not Supported** (iOS-specific):
- ❌ `imessage` → iMessage is Apple-only
- ❌ `safari` → Safari is Apple-only
- ❌ `watch` → (Wear OS is different product, separate module)

**Partially Supported**:
- ⚠️ `app-intent` → Map to Quick Settings Tiles (different UX)
- ⚠️ Live Activities → Map to Ongoing Notifications (different UX)

**Rationale**:
- **Platform Respect**: Don't fake features that don't exist
- **Clear Communication**: Better to not support than to mislead
- **Future-Proof**: Can add types as Android adds features
- **Documentation**: Clearly document what works where

**User Communication**:
```typescript
// Plugin validation
if (props.type === 'imessage' && platform === 'android') {
  console.warn(
    `[expo-targets] Type 'imessage' is iOS-only and not supported on Android. Skipping.`
  );
  return config;
}
```

**Alternatives Considered**:
1. **Fake All Types**: 
   - ❌ Pros: "Full" support
   - ❌ Cons: Misleading, poor UX, user disappointment

2. **Error on Unsupported**: 
   - ❌ Pros: Fail-fast
   - ❌ Cons: Breaks cross-platform apps, forces platform checks

**Decision Outcome**: Warn and skip unsupported types, allow cross-platform apps to work gracefully.

---

## Testing & Quality Decisions

### Decision 20: Example App Updates

**Decision**: Update `widget-interactive` app to support both iOS and Android with same config and TypeScript code

**Rationale**:
- **Dogfooding**: Best test is using it ourselves
- **Documentation**: Live example is better than written docs
- **CI/CD**: Can test both platforms in pipeline
- **User Reference**: Users can copy working example

**Implementation**:
- Update `expo-target.config.json` to include Android
- Add Kotlin implementations for Android
- Keep TypeScript API unchanged
- Document differences in comments

**Structure**:
```
apps/widget-interactive/targets/weather-widget/
├── expo-target.config.json     # Both platforms
├── index.ts                    # Shared TypeScript API
├── ios/                        # iOS SwiftUI
│   ├── Widget.swift
│   ├── WeatherWidgetView.swift
│   └── [size views...]
└── android/                    # Android Kotlin
    ├── WeatherWidget.kt
    ├── WeatherData.kt
    └── WeatherWidgetView.kt
```

**Alternatives Considered**:
1. **Separate Example Apps**: 
   - ❌ Pros: Platform-specific focus
   - ❌ Cons: Duplication, maintenance burden, misses cross-platform value

2. **iOS-Only Examples**: 
   - ❌ Pros: Less work
   - ❌ Cons: Android users have no reference, poor adoption

**Decision Outcome**: Cross-platform example demonstrates full capabilities.

---

## Future-Proofing Decisions

### Decision 21: Plugin Architecture for Extensibility

**Decision**: Design plugin system to easily add new extension types and Android features

**Rationale**:
- **Maintainability**: Adding new types should be straightforward
- **Community**: External contributors can add types
- **Evolution**: Android adds new APIs (e.g., Material You, Predictive Back)
- **Backward Compatibility**: Existing targets don't break when adding features

**Extension Points**:
```typescript
// Adding a new extension type
// 1. Add to types
export type ExtensionType = 'widget' | 'new-type';

// 2. Add Android mapping
export const ANDROID_TYPE_MAP: Record<ExtensionType, AndroidType> = {
  'new-type': 'activity',
};

// 3. Add plugin handler
export function withNewType(config, props) {
  // Implementation
}

// 4. Add to orchestrator
if (props.type === 'new-type') {
  config = withNewType(config, props);
}
```

**Alternatives Considered**:
1. **Hard-Coded Types**: 
   - ❌ Pros: Simple initially
   - ❌ Cons: Hard to extend, brittle

2. **Plugin Registry**: 
   - ❌ Pros: Very flexible
   - ❌ Cons: Over-engineered for current needs

**Decision Outcome**: Structured extension points without over-engineering.

---

### Decision 22: Version Strategy

**Decision**: Major version alignment with breaking changes, platform features can diverge within minor versions

**Rationale**:
- **Semantic Versioning**: Major = breaking, Minor = features, Patch = fixes
- **Platform Parity**: Both platforms at same major version
- **Independent Features**: iOS can get feature in 1.1, Android in 1.2
- **Clear Communication**: Changelog documents platform-specific changes

**Example**:
```
v1.0.0 - Initial iOS support
v1.1.0 - Add iOS Live Activities
v1.2.0 - Add Android widget support
v1.3.0 - Add Android share extensions
v2.0.0 - Breaking: Rename API methods (both platforms)
```

**Alternatives Considered**:
1. **Separate Versioning**: 
   - ❌ Pros: Platform independence
   - ❌ Cons: Confusing, dependency management nightmare

2. **Lockstep Versioning**: 
   - ❌ Pros: Always feature-matched
   - ❌ Cons: Blocks releases, limits platform-specific innovation

**Decision Outcome**: Unified versioning with platform-specific features within minor versions.

---

## Summary of Key Decisions

| # | Decision | Rationale | Impact |
|---|----------|-----------|--------|
| 1 | Separate Gradle modules | Mirrors iOS, better organization | Structure |
| 2 | Glance + AppWidget fallback | Modern + legacy support | Implementation |
| 3 | SharedPreferences | Simple, matches UserDefaults | Storage |
| 4 | Kotlin primary language | Modern, Google-recommended | Code |
| 5 | Jetpack Compose UI | Matches SwiftUI paradigm | DX |
| 6 | Size-based layouts | iOS parity, better UX | Features |
| 7 | JSON serialization | Cross-platform, debuggable | Data |
| 8 | Synchronous API | iOS parity, simplicity | API |
| 9 | Auto-generate modules | Zero config, iOS-like | Build |
| 10 | settings.gradle inclusion | Gradle standard | Build |
| 11 | Project dependencies | Code reuse | Build |
| 12 | Unified TypeScript API | Best DX | API |
| 13 | Expo Modules | Consistency, type safety | Native |
| 14 | Template strings | Simple, maintainable | Codegen |
| 15 | Copy Kotlin files | Mirrors iOS, build integration | Codegen |
| 16 | Android config section | Single source of truth | Config |
| 17 | snake_case colors | Android convention | Config |
| 18 | Unified refresh() | API consistency | Features |
| 19 | Type subset support | Platform respect | Features |
| 20 | Cross-platform example | Best documentation | Testing |
| 21 | Extensible plugins | Future-proof | Architecture |
| 22 | Unified versioning | Clear communication | Maintenance |

---

## Conclusion

Every decision in the Android implementation prioritizes:

1. **Developer Experience**: Consistent, intuitive API across platforms
2. **Platform Native**: Respect Android conventions and best practices
3. **Maintainability**: Clear, well-documented code that's easy to extend
4. **Performance**: Efficient data sharing and widget updates
5. **Future-Proof**: Architecture that can evolve with Android

The result is an Android implementation that feels native to Android developers while providing seamless cross-platform development for Expo users. Each decision was carefully considered with alternatives weighed and documented, ensuring the implementation is both pragmatic and principled.

---

## References

- [ANDROID_TYPE_MAPPING.md](./ANDROID_TYPE_MAPPING.md) - Complete iOS ↔ Android type mapping
- [ANDROID_IMPLEMENTATION_PLAN.md](./ANDROID_IMPLEMENTATION_PLAN.md) - Detailed implementation roadmap
- [ARCHITECTURE.md](./ARCHITECTURE.md) - iOS architecture reference
- [Android Widgets Guide](https://developer.android.com/develop/ui/views/appwidgets)
- [Jetpack Glance](https://developer.android.com/jetpack/compose/glance)
- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)
