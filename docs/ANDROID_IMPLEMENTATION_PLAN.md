# Android Implementation Plan

Comprehensive plan for implementing Android support in expo-targets, mirroring the iOS architecture while respecting Android platform conventions.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Plugin System](#plugin-system)
- [Native Module](#native-module)
- [File Structure](#file-structure)
- [Implementation Phases](#implementation-phases)
- [Detailed Plugin Design](#detailed-plugin-design)
- [Code Generation Strategy](#code-generation-strategy)
- [Testing Strategy](#testing-strategy)
- [Migration Path](#migration-path)

---

## Overview

### Goals

1. **API Parity**: Match iOS API behavior where possible
2. **Platform Native**: Use Android best practices (Gradle, Kotlin, Jetpack)
3. **Developer Experience**: Single config file works for both platforms
4. **Type Safety**: Full TypeScript/Kotlin type checking
5. **Extensibility**: Easy to add new extension types

### Design Principles

- **Separate Modules**: Each widget/extension is a Gradle module (like iOS targets)
- **Generated Configuration**: Auto-generate Gradle files and manifests
- **Unified API**: Same JavaScript API works on both platforms
- **Incremental Adoption**: Can add Android to existing iOS-only targets

---

## Architecture

### High-Level Flow

```
User runs: npx expo prebuild -p android --clean
       │
       ▼
┌──────────────────────────────────────────────────────┐
│ Expo Prebuild Process                                │
│ 1. Load app.json                                     │
│ 2. Resolve plugins: ["expo-targets"]                 │
│ 3. Execute withExpoTargets(config)                   │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ withTargetsDir Plugin                                │
│ 1. Scan targets/*/expo-target.config.json            │
│ 2. Parse configuration                               │
│ 3. Pass to withAndroidTarget (if Android enabled)    │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ withAndroidTarget Plugin (per target)                │
│ Orchestrates:                                         │
│ - withAndroidManifest                                │
│ - withGradleSettings                                 │
│ - withGradleProperties                               │
│ - withAndroidResources                               │
│ - withAndroidModule                                  │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ Android Project Structure                            │
│ - android/settings.gradle (updated)                  │
│ - android/app/build.gradle (updated)                 │
│ - android/{targetName}/ (created)                    │
│   - build.gradle                                     │
│   - src/main/AndroidManifest.xml                     │
│   - src/main/kotlin/...                              │
│   - src/main/res/                                    │
└──────────────────────────────────────────────────────┘
```

### Component Architecture

```
packages/expo-targets/
├── plugin/src/
│   ├── index.ts                    # Entry point
│   ├── withTargetsDir.ts           # Target discovery
│   ├── config.ts                   # Shared types
│   ├── ios/                        # iOS plugins (existing)
│   └── android/                    # Android plugins (new)
│       ├── withAndroidTarget.ts    # Orchestrator
│       ├── config-plugins/
│       │   ├── withAndroidManifest.ts
│       │   ├── withGradleSettings.ts
│       │   ├── withGradleModule.ts
│       │   ├── withAndroidResources.ts
│       │   └── withAndroidColors.ts
│       ├── target.ts               # Android target utils
│       └── utils/
│           ├── gradle.ts           # Gradle manipulation
│           ├── manifest.ts         # AndroidManifest utils
│           ├── resources.ts        # Resource generation
│           └── paths.ts            # Path utilities
├── android/                        # Native module (new)
│   ├── build.gradle
│   └── src/main/kotlin/expo/modules/targets/
│       └── ExpoTargetsModule.kt
└── src/                            # TypeScript API (update)
    ├── TargetStorage.ts            # Update for Android
    └── TargetStorageModule.ts      # Platform-specific exports
```

---

## Plugin System

### Plugin Chain

Mirror the iOS plugin structure:

```
withExpoTargets
  └─ withTargetsDir
      └─ For each target with Android:
          └─ withAndroidTarget
              ├─ withAndroidManifest
              ├─ withGradleSettings (include in settings.gradle)
              ├─ withGradleModule (create module build.gradle)
              ├─ withAndroidResources (colors, drawables, layouts)
              └─ withAndroidColors (for each color)
```

### Plugin Responsibilities

#### 1. `withAndroidTarget` (Orchestrator)

**File**: `plugin/src/android/withAndroidTarget.ts`

**Responsibilities**:
- Validate Android configuration
- Resolve defaults (packageName, minSdk, targetSdk)
- Coordinate sub-plugins
- Handle type-specific logic

**Input**:
```typescript
interface AndroidTargetProps extends AndroidTargetConfig {
  type: ExtensionType;
  name: string;
  displayName?: string;
  appGroup?: string;
  directory: string;
  configPath: string;
}
```

**Output**: Modified Expo config with Android module configured

#### 2. `withAndroidManifest`

**File**: `plugin/src/android/config-plugins/withAndroidManifest.ts`

**Responsibilities**:
- Generate widget receiver declarations
- Add intent filters for share/action extensions
- Add permissions
- Configure application attributes

**Generated Manifest** (widget example):
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <uses-permission android:name="android.permission.INTERNET" />
    
    <application>
        <receiver
            android:name=".WeatherWidget"
            android:exported="true"
            android:label="@string/widget_name">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/weather_widget_info" />
        </receiver>
    </application>
</manifest>
```

#### 3. `withGradleSettings`

**File**: `plugin/src/android/config-plugins/withGradleSettings.ts`

**Responsibilities**:
- Modify `android/settings.gradle` to include new module
- Register module in project

**Generated Settings Addition**:
```gradle
// Added by expo-targets
include ':WeatherWidget'
project(':WeatherWidget').projectDir = new File(rootProject.projectDir, '../WeatherWidget')
```

#### 4. `withGradleModule`

**File**: `plugin/src/android/config-plugins/withGradleModule.ts`

**Responsibilities**:
- Generate module `build.gradle`
- Configure dependencies
- Set compilation options

**Generated `build.gradle`** (widget example):
```gradle
plugins {
    id 'com.android.library'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.test.widgetinteractive.weather'
    compileSdk 34

    defaultConfig {
        minSdk 26
        targetSdk 34
    }

    buildFeatures {
        compose true
    }

    composeOptions {
        kotlinCompilerExtensionVersion '1.5.3'
    }

    kotlinOptions {
        jvmTarget = '1.8'
    }
}

dependencies {
    implementation project(':app')
    
    // Glance for modern widgets
    implementation 'androidx.glance:glance-appwidget:1.0.0'
    implementation 'androidx.compose.runtime:runtime:1.5.4'
    implementation 'androidx.compose.ui:ui:1.5.4'
    
    // Data storage
    implementation 'androidx.datastore:datastore-preferences:1.0.0'
}
```

#### 5. `withAndroidResources`

**File**: `plugin/src/android/config-plugins/withAndroidResources.ts`

**Responsibilities**:
- Generate `res/xml/` widget info files
- Generate `res/layout/` widget layouts (legacy AppWidget)
- Copy drawable resources
- Generate strings.xml

**Generated Widget Info** (`res/xml/weather_widget_info.xml`):
```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:previewImage="@drawable/widget_preview"
    android:initialLayout="@layout/weather_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_description" />
```

#### 6. `withAndroidColors`

**File**: `plugin/src/android/config-plugins/withAndroidColors.ts`

**Responsibilities**:
- Generate `res/values/colors.xml`
- Generate `res/values-night/colors.xml` for dark mode
- Convert color formats (hex, rgb, named)

**Generated Colors** (`res/values/colors.xml`):
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="accent_color">#007AFF</color>
    <color name="sunny_color">#FFB800</color>
    <color name="cloudy_color">#8E8E93</color>
    <color name="rainy_color">#5AC8FA</color>
    <color name="background_color">#FFFFFF</color>
    <color name="text_primary">#000000</color>
    <color name="text_secondary">#666666</color>
</resources>
```

**Dark Mode** (`res/values-night/colors.xml`):
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="accent_color">#0A84FF</color>
    <color name="sunny_color">#FFD60A</color>
    <color name="cloudy_color">#98989D</color>
    <color name="rainy_color">#64D2FF</color>
    <color name="background_color">#1C1C1E</color>
    <color name="text_primary">#FFFFFF</color>
    <color name="text_secondary">#98989D</color>
</resources>
```

---

## Native Module

### Kotlin Implementation

**File**: `packages/expo-targets/android/src/main/kotlin/expo/modules/targets/ExpoTargetsModule.kt`

**Core Module**:
```kotlin
package expo.modules.targets

import android.content.Context
import android.content.SharedPreferences
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoTargetsModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoTargets")

        Function("setString") { key: String, value: String, group: String? ->
            getPreferences(group).edit().putString(key, value).apply()
        }

        Function("setInt") { key: String, value: Int, group: String? ->
            getPreferences(group).edit().putInt(key, value).apply()
        }

        Function("get") { key: String, group: String? ->
            getPreferences(group).getString(key, null)
        }

        Function("remove") { key: String, group: String? ->
            getPreferences(group).edit().remove(key).apply()
        }

        Function("refreshTarget") { name: String? ->
            refreshWidgets(name)
        }

        Function("closeExtension") {
            // Close current activity (for share extensions)
            appContext.currentActivity?.finish()
        }

        Function("openHostApp") { path: String ->
            val packageName = appContext.reactContext?.packageName
            val intent = appContext.reactContext?.packageManager
                ?.getLaunchIntentForPackage(packageName ?: "")
            intent?.putExtra("path", path)
            appContext.currentActivity?.startActivity(intent)
        }
    }

    private fun getPreferences(group: String?): SharedPreferences {
        val prefsName = group ?: "expo_targets"
        return appContext.reactContext?.getSharedPreferences(
            prefsName,
            Context.MODE_PRIVATE
        ) ?: throw Exception("Context not available")
    }

    private fun refreshWidgets(targetName: String?) {
        val context = appContext.reactContext ?: return
        
        if (targetName != null) {
            // Refresh specific widget
            val componentName = ComponentName(context, targetName)
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(componentName)
            
            // Trigger update
            manager.notifyAppWidgetViewDataChanged(ids, android.R.id.list)
        } else {
            // Refresh all widgets
            // Implementation for all widgets
        }
    }
}
```

**Package Export** (`ExpoTargetsPackage.kt`):
```kotlin
package expo.modules.targets

import expo.modules.kotlin.modules.Module
import expo.modules.core.interfaces.Package

class ExpoTargetsPackage : Package {
    override fun createExpoModules(): List<Class<out Module>> {
        return listOf(ExpoTargetsModule::class.java)
    }
}
```

**Build Configuration** (`android/build.gradle`):
```gradle
apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'
apply plugin: 'maven-publish'

group = 'expo.modules.targets'
version = '0.1.0'

android {
    namespace 'expo.modules.targets'
    compileSdk 34

    defaultConfig {
        minSdk 23
        targetSdk 34
    }

    kotlinOptions {
        jvmTarget = '1.8'
    }
}

dependencies {
    implementation 'org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.0'
    
    // Expo modules
    implementation 'expo.modules:expo-modules-core:1.5.0'
    
    // Android core
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
}
```

---

## File Structure

### Generated Android Project Structure

After `npx expo prebuild -p android`, the following structure is created:

```
android/
├── settings.gradle                          # Modified: includes new modules
├── app/
│   └── build.gradle                         # Modified: dependencies on widget modules
│
└── WeatherWidget/                           # Created per widget
    ├── build.gradle                         # Generated module config
    ├── src/
    │   └── main/
    │       ├── AndroidManifest.xml          # Generated manifest
    │       ├── kotlin/
    │       │   └── com/test/widgetinteractive/weather/
    │       │       ├── WeatherWidget.kt     # Copied from targets/.../android/
    │       │       ├── WeatherData.kt       # Copied
    │       │       └── WeatherWidgetView.kt # Copied
    │       └── res/
    │           ├── xml/
    │           │   └── weather_widget_info.xml  # Generated
    │           ├── values/
    │           │   ├── colors.xml           # Generated from config
    │           │   └── strings.xml          # Generated
    │           ├── values-night/
    │           │   └── colors.xml           # Generated (dark mode)
    │           ├── drawable/
    │           │   └── widget_preview.png   # Copied
    │           └── layout/
    │               └── weather_widget.xml   # Generated (legacy fallback)
    └── .gitignore
```

### Source Target Structure

Users create Kotlin files in their target directory:

```
targets/
└── weather-widget/
    ├── expo-target.config.json              # Config for both platforms
    ├── index.ts                             # TypeScript API (both platforms)
    ├── ios/                                 # iOS-specific code
    │   ├── Widget.swift
    │   └── WeatherWidgetView.swift
    └── android/                             # Android-specific code (new)
        ├── WeatherWidget.kt                 # Main widget class
        ├── WeatherData.kt                   # Data model
        └── WeatherWidgetView.kt             # Composable UI
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Basic widget support with Glance API

**Deliverables**:
1. ✅ Android native module (`ExpoTargetsModule.kt`)
2. ✅ SharedPreferences storage implementation
3. ✅ Basic plugin structure (`withAndroidTarget`)
4. ✅ Manifest generation for widgets
5. ✅ Gradle module generation
6. ✅ Simple Glance widget example

**Files to Create**:
- `packages/expo-targets/android/` (entire directory)
- `packages/expo-targets/plugin/src/android/withAndroidTarget.ts`
- `packages/expo-targets/plugin/src/android/config-plugins/withAndroidManifest.ts`
- `packages/expo-targets/plugin/src/android/config-plugins/withGradleModule.ts`
- `packages/expo-targets/plugin/src/android/config-plugins/withGradleSettings.ts`
- `packages/expo-targets/plugin/src/android/utils/gradle.ts`
- `packages/expo-targets/plugin/src/android/utils/manifest.ts`
- `packages/expo-targets/plugin/src/android/utils/paths.ts`
- `packages/expo-targets/plugin/src/android/target.ts`

**Success Criteria**:
- `npx expo prebuild -p android` generates widget module
- Widget appears in Android launcher widget picker
- Data can be shared between app and widget

### Phase 2: Resources & Styling (Week 3)

**Goal**: Color system, resources, and layout generation

**Deliverables**:
1. ✅ Color resource generation (light/dark mode)
2. ✅ Drawable resource copying
3. ✅ String resource generation
4. ✅ Widget info XML generation
5. ✅ Layout XML generation (legacy AppWidget fallback)

**Files to Create**:
- `packages/expo-targets/plugin/src/android/config-plugins/withAndroidResources.ts`
- `packages/expo-targets/plugin/src/android/config-plugins/withAndroidColors.ts`
- `packages/expo-targets/plugin/src/android/utils/resources.ts`

**Success Criteria**:
- Colors from config appear in widget
- Dark mode works automatically
- Preview image displays in widget picker

### Phase 3: Widget Refresh & Runtime API (Week 4)

**Goal**: Complete widget lifecycle and JavaScript API

**Deliverables**:
1. ✅ `refreshTarget()` implementation
2. ✅ AppWidgetManager integration
3. ✅ Glance `updateAll()` wrapper
4. ✅ Platform-specific module exports
5. ✅ Update TypeScript types for Android

**Files to Update**:
- `packages/expo-targets/src/TargetStorage.ts` (add Android logic)
- `packages/expo-targets/src/TargetStorageModule.ts` (platform checks)
- `packages/expo-targets/android/src/main/kotlin/.../ExpoTargetsModule.kt` (refresh logic)

**Success Criteria**:
- `weatherWidget.set('data', value)` updates widget on Android
- `weatherWidget.refresh()` triggers immediate update
- Same TypeScript API works on both platforms

### Phase 4: Share & Action Extensions (Week 5-6)

**Goal**: Support React Native in share/action extensions

**Deliverables**:
1. ✅ Share target activity generation
2. ✅ Intent filter configuration
3. ✅ React Native bridge for share extensions
4. ✅ Action extension support

**Files to Create**:
- `packages/expo-targets/plugin/src/android/config-plugins/withShareTarget.ts`
- `packages/expo-targets/plugin/src/android/config-plugins/withActionExtension.ts`

**Success Criteria**:
- Share sheet shows app as target
- React Native renders in share activity
- Data can be extracted from Intent

### Phase 5: Advanced Extensions (Week 7-8)

**Goal**: Notification, background, and other extension types

**Deliverables**:
1. ✅ Notification service extension
2. ✅ Background download (WorkManager)
3. ✅ App shortcuts (intent/intent-ui)
4. ✅ Quick Settings tile

**Files to Create**:
- `packages/expo-targets/plugin/src/android/config-plugins/withNotificationExtension.ts`
- `packages/expo-targets/plugin/src/android/config-plugins/withBackgroundDownload.ts`
- `packages/expo-targets/plugin/src/android/config-plugins/withAppShortcuts.ts`

**Success Criteria**:
- Custom notifications display correctly
- Background downloads work reliably
- App shortcuts appear in launcher

### Phase 6: Testing & Documentation (Week 9-10)

**Goal**: Comprehensive testing and docs

**Deliverables**:
1. ✅ Unit tests for all plugins
2. ✅ Integration tests
3. ✅ Example apps for each extension type
4. ✅ Migration guide
5. ✅ API documentation
6. ✅ Troubleshooting guide

**Files to Create**:
- `packages/expo-targets/plugin/src/android/__tests__/` (entire directory)
- `docs/android-getting-started.md`
- `docs/android-migration.md`
- `docs/android-troubleshooting.md`

**Success Criteria**:
- All tests pass on Android
- Examples work on Android 8+
- Documentation is comprehensive

---

## Detailed Plugin Design

### withAndroidTarget Implementation

**File**: `packages/expo-targets/plugin/src/android/withAndroidTarget.ts`

```typescript
import { ConfigPlugin } from '@expo/config-plugins';
import { withAndroidManifest } from './config-plugins/withAndroidManifest';
import { withGradleSettings } from './config-plugins/withGradleSettings';
import { withGradleModule } from './config-plugins/withGradleModule';
import { withAndroidResources } from './config-plugins/withAndroidResources';
import { withAndroidColors } from './config-plugins/withAndroidColors';
import type { ExtensionType, AndroidTargetConfig } from '../config';

interface AndroidTargetProps extends AndroidTargetConfig {
  type: ExtensionType;
  name: string;
  displayName?: string;
  appGroup?: string;
  directory: string;
  configPath: string;
}

export const withAndroidTarget: ConfigPlugin<AndroidTargetProps> = (config, props) => {
  console.log(`[expo-targets] Processing Android target: ${props.name} (${props.type})`);

  // Validate type support
  const SUPPORTED_TYPES: ExtensionType[] = ['widget', 'share', 'action', 'clip'];
  if (!SUPPORTED_TYPES.includes(props.type)) {
    console.warn(
      `[expo-targets] Android support for type '${props.type}' is not yet implemented. Skipping.`
    );
    return config;
  }

  // Resolve defaults
  const mainPackageName = config.android?.package;
  if (!mainPackageName) {
    throw new Error('Android package name not found in app.json');
  }

  const packageName = props.packageName || `${mainPackageName}.${props.name.toLowerCase()}`;
  const minSdkVersion = props.minSdkVersion || getMinSdkForType(props.type);
  const targetSdkVersion = props.targetSdkVersion || 34;
  const displayName = props.displayName || props.name;

  // Orchestrate plugins
  config = withGradleSettings(config, {
    moduleName: props.name,
    directory: props.directory,
  });

  config = withGradleModule(config, {
    type: props.type,
    name: props.name,
    packageName,
    minSdkVersion,
    targetSdkVersion,
    directory: props.directory,
    useGlance: props.useGlance ?? (targetSdkVersion >= 33),
  });

  config = withAndroidManifest(config, {
    type: props.type,
    name: props.name,
    displayName,
    packageName,
    directory: props.directory,
    permissions: props.permissions || [],
  });

  config = withAndroidResources(config, {
    type: props.type,
    name: props.name,
    directory: props.directory,
    updatePeriodMillis: props.updatePeriodMillis,
    resizeMode: props.resizeMode,
    widgetCategory: props.widgetCategory,
    previewImage: props.previewImage,
  });

  if (props.colors && Object.keys(props.colors).length > 0) {
    config = withAndroidColors(config, {
      colors: props.colors,
      directory: props.directory,
    });
  }

  return config;
};

function getMinSdkForType(type: ExtensionType): number {
  const MIN_SDK_MAP: Record<ExtensionType, number> = {
    widget: 26, // Android 8.0 (AppWidget), 33 for Glance
    clip: 23, // Android 6.0 for Instant Apps
    share: 23,
    action: 23,
    // ... other types
  };
  return MIN_SDK_MAP[type] || 23;
}
```

### withGradleModule Implementation

**File**: `packages/expo-targets/plugin/src/android/config-plugins/withGradleModule.ts`

```typescript
import { ConfigPlugin } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';
import type { ExtensionType } from '../../config';

interface GradleModuleProps {
  type: ExtensionType;
  name: string;
  packageName: string;
  minSdkVersion: number;
  targetSdkVersion: number;
  directory: string;
  useGlance: boolean;
}

export const withGradleModule: ConfigPlugin<GradleModuleProps> = (config, props) => {
  const projectRoot = config._internal!.projectRoot;
  const androidProjectRoot = path.join(projectRoot, 'android');
  const moduleDir = path.join(androidProjectRoot, props.name);
  const buildGradlePath = path.join(moduleDir, 'build.gradle');

  // Ensure module directory exists
  fs.mkdirSync(moduleDir, { recursive: true });

  // Generate build.gradle
  const buildGradleContent = generateBuildGradle(props);
  fs.writeFileSync(buildGradlePath, buildGradleContent, 'utf-8');

  console.log(`[expo-targets] Created build.gradle for ${props.name}`);

  // Create source directories
  const srcDir = path.join(moduleDir, 'src/main');
  const kotlinDir = path.join(srcDir, 'kotlin', ...props.packageName.split('.'));
  const resDir = path.join(srcDir, 'res');

  fs.mkdirSync(kotlinDir, { recursive: true });
  fs.mkdirSync(resDir, { recursive: true });

  // Copy Kotlin source files from targets/{name}/android/
  copySourceFiles(projectRoot, props.directory, kotlinDir);

  return config;
};

function generateBuildGradle(props: GradleModuleProps): string {
  const isWidget = props.type === 'widget';
  const useCompose = isWidget && props.useGlance;

  return `
plugins {
    id 'com.android.library'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace '${props.packageName}'
    compileSdk ${props.targetSdkVersion}

    defaultConfig {
        minSdk ${props.minSdkVersion}
        targetSdk ${props.targetSdkVersion}
    }

    ${useCompose ? `
    buildFeatures {
        compose true
    }

    composeOptions {
        kotlinCompilerExtensionVersion '1.5.3'
    }
    ` : ''}

    kotlinOptions {
        jvmTarget = '1.8'
    }
}

dependencies {
    implementation project(':app')
    
    ${generateDependencies(props)}
}
`.trim();
}

function generateDependencies(props: GradleModuleProps): string {
  const deps: string[] = [
    "implementation 'org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.0'",
    "implementation 'androidx.core:core-ktx:1.12.0'",
  ];

  if (props.type === 'widget') {
    if (props.useGlance) {
      deps.push(
        "// Glance for modern widgets",
        "implementation 'androidx.glance:glance-appwidget:1.0.0'",
        "implementation 'androidx.compose.runtime:runtime:1.5.4'",
        "implementation 'androidx.compose.ui:ui:1.5.4'",
        "implementation 'androidx.compose.material3:material3:1.1.2'"
      );
    } else {
      deps.push(
        "// Legacy AppWidget",
        "implementation 'androidx.appcompat:appcompat:1.6.1'"
      );
    }
    deps.push(
      "// Data storage",
      "implementation 'androidx.datastore:datastore-preferences:1.0.0'"
    );
  }

  if (props.type === 'share' || props.type === 'action') {
    deps.push(
      "// React Native (if enabled)",
      "implementation 'com.facebook.react:react-native:+'  // From main app"
    );
  }

  return deps.map(d => `    ${d}`).join('\n');
}

function copySourceFiles(projectRoot: string, targetDir: string, destDir: string) {
  const androidSourceDir = path.join(projectRoot, targetDir, 'android');
  
  if (!fs.existsSync(androidSourceDir)) {
    console.warn(`[expo-targets] No android/ directory found in ${targetDir}`);
    return;
  }

  const files = fs.readdirSync(androidSourceDir);
  files.forEach(file => {
    if (file.endsWith('.kt') || file.endsWith('.java')) {
      const srcFile = path.join(androidSourceDir, file);
      const destFile = path.join(destDir, file);
      fs.copyFileSync(srcFile, destFile);
      console.log(`[expo-targets] Copied ${file}`);
    }
  });
}
```

### withAndroidManifest Implementation

**File**: `packages/expo-targets/plugin/src/android/config-plugins/withAndroidManifest.ts`

```typescript
import {
  ConfigPlugin,
  AndroidConfig,
  withAndroidManifest,
} from '@expo/config-plugins';
import type { ExtensionType } from '../../config';

interface ManifestProps {
  type: ExtensionType;
  name: string;
  displayName: string;
  packageName: string;
  directory: string;
  permissions: string[];
}

export const withAndroidManifest: ConfigPlugin<ManifestProps> = (config, props) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    // Add permissions
    props.permissions.forEach(permission => {
      AndroidConfig.Manifest.addPermission(manifest, permission);
    });

    // Add type-specific manifest entries
    if (props.type === 'widget') {
      addWidgetReceiver(mainApplication, props);
    } else if (props.type === 'share') {
      addShareActivity(mainApplication, props);
    } else if (props.type === 'action') {
      addActionActivity(mainApplication, props);
    }

    return config;
  });
};

function addWidgetReceiver(application: any, props: ManifestProps) {
  const receiver = {
    $: {
      'android:name': `.${props.name}`,
      'android:exported': 'true',
      'android:label': `@string/${props.name.toLowerCase()}_name`,
    },
    'intent-filter': [
      {
        action: [
          {
            $: {
              'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
            },
          },
        ],
      },
    ],
    'meta-data': [
      {
        $: {
          'android:name': 'android.appwidget.provider',
          'android:resource': `@xml/${props.name.toLowerCase()}_info`,
        },
      },
    ],
  };

  if (!application.receiver) {
    application.receiver = [];
  }
  application.receiver.push(receiver);
}

function addShareActivity(application: any, props: ManifestProps) {
  const activity = {
    $: {
      'android:name': `.${props.name}Activity`,
      'android:exported': 'true',
      'android:label': `@string/${props.name.toLowerCase()}_name`,
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
        category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
        data: [
          { $: { 'android:mimeType': 'text/*' } },
          { $: { 'android:mimeType': 'image/*' } },
        ],
      },
    ],
  };

  if (!application.activity) {
    application.activity = [];
  }
  application.activity.push(activity);
}

function addActionActivity(application: any, props: ManifestProps) {
  // Similar to share but with different intent filter
  const activity = {
    $: {
      'android:name': `.${props.name}Activity`,
      'android:exported': 'true',
      'android:label': `@string/${props.name.toLowerCase()}_name`,
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.intent.action.PROCESS_TEXT' } }],
        category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
        data: [{ $: { 'android:mimeType': 'text/plain' } }],
      },
    ],
  };

  if (!application.activity) {
    application.activity = [];
  }
  application.activity.push(activity);
}
```

---

## Code Generation Strategy

### 1. Kotlin Widget Template (Glance)

**Generated File**: `android/{WidgetName}/{WidgetName}.kt`

```kotlin
package com.test.widgetinteractive.weather

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.*
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.decodeFromString

// Generated by expo-targets - DO NOT EDIT
// User implementation should be in targets/weather-widget/android/

class WeatherWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Load data from SharedPreferences
        val data = loadWeatherData(context)
        
        provideContent {
            // User's custom UI
            WeatherWidgetView(data)
        }
    }
    
    private fun loadWeatherData(context: Context): WeatherData? {
        val prefs = context.getSharedPreferences("expo_targets", Context.MODE_PRIVATE)
        val jsonString = prefs.getString("weather", null) ?: return null
        
        return try {
            Json.decodeFromString<WeatherData>(jsonString)
        } catch (e: Exception) {
            null
        }
    }
}

class WeatherWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = WeatherWidget()
}
```

### 2. Legacy AppWidget Template

For older Android versions or when Glance is not used:

```kotlin
package com.test.widgetinteractive.weather

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

class WeatherWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { widgetId ->
            val views = RemoteViews(context.packageName, R.layout.weather_widget)
            
            // Load data
            val data = loadWeatherData(context)
            data?.let {
                views.setTextViewText(R.id.temperature, "${it.temperature}°")
                views.setTextViewText(R.id.condition, it.condition)
            }
            
            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
    
    private fun loadWeatherData(context: Context): WeatherData? {
        val prefs = context.getSharedPreferences("expo_targets", Context.MODE_PRIVATE)
        val jsonString = prefs.getString("weather", null) ?: return null
        
        return try {
            Json.decodeFromString<WeatherData>(jsonString)
        } catch (e: Exception) {
            null
        }
    }
}
```

---

## Testing Strategy

### Unit Tests

**Location**: `packages/expo-targets/plugin/src/android/__tests__/`

```typescript
// withAndroidTarget.test.ts
import { withAndroidTarget } from '../withAndroidTarget';

describe('withAndroidTarget', () => {
  it('should add widget module to config', () => {
    const config = {
      android: { package: 'com.test.app' },
      _internal: { projectRoot: '/test' },
    };
    
    const result = withAndroidTarget(config as any, {
      type: 'widget',
      name: 'TestWidget',
      directory: 'targets/test-widget',
      configPath: 'targets/test-widget/expo-target.config.json',
    });
    
    // Assert module was configured
    expect(result).toBeDefined();
  });
});
```

### Integration Tests

Test full prebuild flow:

```bash
# Test Android prebuild
cd apps/widget-interactive
npx expo prebuild -p android --clean

# Verify generated files
test -f android/WeatherWidget/build.gradle
test -f android/WeatherWidget/src/main/AndroidManifest.xml
test -d android/WeatherWidget/src/main/res

# Build Android project
cd android && ./gradlew assembleDebug
```

### Manual Testing Checklist

- [ ] Widget appears in launcher widget picker
- [ ] Widget displays correctly on home screen
- [ ] Data updates when set from main app
- [ ] `refresh()` triggers immediate update
- [ ] Dark mode colors work
- [ ] Different widget sizes display correctly
- [ ] Share extension appears in share sheet
- [ ] React Native renders in share activity

---

## Migration Path

### Adding Android to Existing iOS Target

**Step 1**: Update config to include Android:

```json
{
  "type": "widget",
  "name": "WeatherWidget",
  "platforms": ["ios", "android"],  // Add "android"
  "android": {
    // Android-specific config
  }
}
```

**Step 2**: Create Android implementation:

```
targets/weather-widget/
├── expo-target.config.json  (updated)
├── index.ts                 (works for both)
├── ios/                     (existing)
│   └── Widget.swift
└── android/                 (new)
    ├── WeatherWidget.kt
    ├── WeatherData.kt
    └── WeatherWidgetView.kt
```

**Step 3**: Run prebuild:

```bash
npx expo prebuild -p android --clean
```

**Step 4**: Test on Android:

```bash
cd android
./gradlew installDebug
```

### Gradual Rollout

1. **Phase 1**: Add Android to one widget, test thoroughly
2. **Phase 2**: Add to remaining widgets once confident
3. **Phase 3**: Add share/action extensions
4. **Phase 4**: Add advanced extension types

---

## Next Steps

1. ✅ Review and approve this plan
2. ✅ Begin Phase 1 implementation
3. Create Android-specific example (update widget-interactive)
4. Document Android-specific considerations
5. Create migration guide for existing users

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding Android support to expo-targets while maintaining API parity with iOS and respecting Android platform conventions. The phased approach allows for incremental development and testing, ensuring stability at each stage.

The generated code will mirror the iOS structure as closely as possible, providing a consistent developer experience across both platforms while leveraging each platform's strengths (SwiftUI for iOS, Jetpack Compose/Glance for Android).
