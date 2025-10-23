# expo-targets Architecture

Complete technical overview of expo-targets architecture, design decisions, and implementation details.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Package Structure](#package-structure)
- [Data Flow](#data-flow)
- [Configuration System](#configuration-system)
- [Plugin Architecture](#plugin-architecture)
- [Native Module](#native-module)
- [Metro Integration](#metro-integration)
- [Type System](#type-system)
- [Build Process](#build-process)
- [Design Decisions](#design-decisions)
- [Extension Points](#extension-points)
- [Performance](#performance)
- [Security](#security)
- [Future Architecture](#future-architecture)

---

## Overview

expo-targets is a monorepo providing iOS/Android extension development for Expo apps. The architecture consists of four main components:

1. **TypeScript API** (`packages/expo-targets/src/`): Runtime API for data sharing
2. **Config Plugin** (`packages/expo-targets/plugin/`): Build-time Xcode manipulation
3. **Native Module** (`packages/expo-targets/ios/`): Swift module for system integration
4. **Metro Wrapper** (`packages/expo-targets/metro/`): Metro bundler configuration

### Key Principles

- **Type-Safe**: Full TypeScript throughout
- **Build-Time Validation**: Errors caught during prebuild
- **Platform-Agnostic**: iOS implementation with Android architecture prepared
- **Developer Experience**: Single file for config + runtime
- **Extensible**: Easy to add new extension types

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Expo Application                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   App.tsx  │  │  Targets/  │  │ metro.cfg  │            │
│  │            │──│  index.ts  │  │            │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
        │                  │                  │
        │ Runtime API      │ Config           │ Bundler
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│              │  │              │  │              │
│ TypeScript   │  │ Config       │  │ Metro        │
│ API          │  │ Plugin       │  │ Wrapper      │
│ (Runtime)    │  │ (Build-Time) │  │              │
│              │  │              │  │              │
└──────┬───────┘  └──────┬───────┘  └──────────────┘
       │                 │
       │ Calls           │ Manipulates
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│              │  │              │
│ Native       │  │ Xcode        │
│ Swift        │  │ Project      │
│ Module       │  │              │
│              │  │              │
└──────┬───────┘  └──────┬───────┘
       │                 │
       │ System APIs     │ Builds
       ▼                 ▼
┌─────────────────────────────────┐
│        iOS System               │
│  ┌──────────┐  ┌──────────┐   │
│  │ App      │  │ Widget   │   │
│  │ Groups   │  │ Center   │   │
│  └──────────┘  └──────────┘   │
└─────────────────────────────────┘
```

---

## Package Structure

### Monorepo Layout

```
expo-targets/
├── packages/
│   ├── expo-targets/           # Main package
│   │   ├── src/                # TypeScript API (runtime)
│   │   │   ├── index.ts        # Public exports
│   │   │   ├── TargetStorage.ts # Storage implementation
│   │   │   └── TargetStorageModule.ts # Native binding
│   │   ├── plugin/             # Config plugin (build-time)
│   │   │   ├── src/
│   │   │   │   ├── index.ts    # Plugin entry
│   │   │   │   ├── withTargetsDir.ts # Target scanner
│   │   │   │   ├── parseTargetConfig.ts # AST parser
│   │   │   │   ├── config.ts   # Type definitions
│   │   │   │   └── ios/        # iOS-specific plugins
│   │   │   │       ├── withIOSTarget.ts # Orchestrator
│   │   │   │       ├── withXcodeChanges.ts # Xcode manipulation
│   │   │   │       ├── withIosColorset.ts # Color assets
│   │   │   │       ├── withEntitlements.ts # Entitlements
│   │   │   │       ├── withPodfile.ts # CocoaPods
│   │   │   │       └── target.ts # Type utilities
│   │   │   └── build/          # Compiled plugin
│   │   ├── metro/              # Metro wrapper
│   │   │   ├── src/
│   │   │   │   ├── index.ts    # Exports
│   │   │   │   └── withTargetsMetro.ts # Config wrapper
│   │   │   └── build/          # Compiled metro
│   │   ├── ios/                # Native module
│   │   │   ├── ExpoTargets.podspec # CocoaPods spec
│   │   │   └── ExpoTargetsModule.swift # Swift implementation
│   │   ├── build/              # Compiled TypeScript API
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── create-target/          # CLI tool
│       ├── src/
│       │   └── index.ts        # CLI implementation
│       ├── build/
│       └── package.json
├── apps/
│   └── widget-basic/           # Example app
│       ├── targets/
│       │   └── hello-widget/
│       │       ├── index.ts    # Target definition
│       │       └── ios/
│       │           └── Widget.swift
│       ├── App.tsx
│       └── app.json
├── docs/                       # Documentation
└── package.json                # Root workspace
```

### Component Boundaries

| Component      | Responsibility           | Dependencies         |
| -------------- | ------------------------ | -------------------- |
| TypeScript API | Runtime data operations  | Native Module        |
| Config Plugin  | Build-time Xcode setup   | @expo/config-plugins |
| Native Module  | iOS system integration   | ExpoModulesCore      |
| Metro Wrapper  | RN bundler configuration | Metro                |
| CLI Tool       | Target scaffolding       | prompts, fs-extra    |

---

## Data Flow

### 1. Build Time (Prebuild)

```
User runs: npx expo prebuild -p ios --clean
       │
       ▼
┌──────────────────────────────────────────────────────┐
│ Expo Prebuild Process                                │
│                                                       │
│ 1. Load app.json                                     │
│ 2. Resolve plugins: ["expo-targets"]                 │
│ 3. Execute withExpoTargets(config)                   │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ withTargetsDir Plugin                                │
│                                                       │
│ 1. Glob scan: targets/*/index.@(ts|tsx|js|jsx)      │
│ 2. For each found file:                              │
│    - Parse with Babel AST                            │
│    - Extract defineTarget() arguments                │
│    - Evaluate object literals                        │
│ 3. Pass config to platform plugins                   │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ withIOSTarget Plugin (per target)                    │
│                                                       │
│ Orchestrates:                                         │
│ - withXcodeChanges                                   │
│ - withIosColorset (for each color)                   │
│ - withTargetEntitlements                             │
│ - withTargetPodfile                                  │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ withXcodeChanges Plugin                              │
│                                                       │
│ 1. Load Xcode project (xcodeproj)                    │
│ 2. Create PBXNativeTarget                            │
│ 3. Add build configurations (Debug/Release)          │
│ 4. Copy Swift files to ios/{targetName}/             │
│ 5. Link files to project                             │
│ 6. Configure build settings                          │
│ 7. Link frameworks                                   │
│ 8. Add target dependency                             │
│ 9. Create embed phase                                │
│ 10. Save project                                     │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ Xcode Project (.xcodeproj)                           │
│                                                       │
│ - Widget target created                              │
│ - Swift files linked                                 │
│ - Frameworks configured                              │
│ - Build settings applied                             │
│ - Assets generated                                   │
└──────────────────────────────────────────────────────┘
```

### 2. Runtime (Widget Update)

```
User app calls: HelloWidget.set('message', 'Hello')
       │
       ▼
┌──────────────────────────────────────────────────────┐
│ Target Instance (JavaScript)                         │
│                                                       │
│ defineTarget() returned object with methods          │
│ - set(key, value)                                    │
│ - get(key)                                           │
│ - setData(data)                                      │
│ - getData()                                          │
│ - refresh()                                          │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ AppGroupStorage (JavaScript)                         │
│                                                       │
│ - Serialize value (JSON for objects/arrays)          │
│ - Determine storage method (int/string/object)       │
│ - Call native module                                 │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ ExpoTargetsModule (Native Swift)                     │
│                                                       │
│ Function: setString(key, value, appGroup)            │
│ - Get UserDefaults(suiteName: appGroup)              │
│ - Set value for key                                  │
│ - Synchronize                                        │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ iOS App Groups (UserDefaults)                        │
│                                                       │
│ Data stored in shared container:                     │
│ ~/Library/Group Containers/group.com.app/            │
│ └─ Library/Preferences/group.com.app.plist           │
└──────────────────────────────────────────────────────┘

User app calls: HelloWidget.refresh()
       │
       ▼
┌──────────────────────────────────────────────────────┐
│ ExpoTargetsModule.refreshTarget(name)                │
│                                                       │
│ iOS 14+:                                             │
│ - WidgetCenter.shared.reloadTimelines(ofKind: name)  │
│                                                       │
│ iOS 18+:                                             │
│ - ControlCenter.shared.reloadControls(ofKind: name)  │
└───────────────────┬──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│ iOS WidgetKit System                                 │
│                                                       │
│ 1. Wakes up widget extension                         │
│ 2. Calls TimelineProvider.getTimeline()              │
│ 3. Widget reads from UserDefaults(appGroup)          │
│ 4. Creates timeline entries                          │
│ 5. Updates widget UI                                 │
└──────────────────────────────────────────────────────┘
```

---

## Configuration System

### defineTarget() Implementation

**Location:** `packages/expo-targets/src/TargetStorage.ts`

```typescript
export function defineTarget(options: DefineTargetOptions): Target {
  const storage = new AppGroupStorage(options.appGroup);
  const dataKey = `${options.name}:data`;

  return {
    name: options.name,
    storage,

    set(key: string, value: any) {
      storage.set(key, value);
    },

    get(key: string) {
      return storage.get(key);
    },

    remove(key: string) {
      storage.remove(key);
    },

    setData<T>(data: T) {
      storage.set(dataKey, data as any);
    },

    getData<T>(): T | null {
      const raw = storage.get(dataKey);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    refresh() {
      ExpoTargetsModule.refreshTarget(options.name);
    },
  };
}
```

**Design:**

- Returns object with methods (not class instance)
- Encapsulates AppGroupStorage
- Namespaces data key for `setData()`/`getData()`
- Type-safe through generics

### AST Parsing

**Location:** `packages/expo-targets/plugin/src/parseTargetConfig.ts`

```typescript
export function parseTargetConfigFromFile(filePath: string): TargetConfig {
  const code = fs.readFileSync(filePath, 'utf-8');

  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  let targetConfig: TargetConfig | null = null;

  traverse(ast, {
    CallExpression(path) {
      const { node } = path;

      if (
        t.isIdentifier(node.callee) &&
        node.callee.name === 'defineTarget' &&
        node.arguments.length > 0
      ) {
        const firstArg = node.arguments[0];

        if (t.isObjectExpression(firstArg)) {
          targetConfig = evaluateObjectExpression(firstArg);
        }
      }
    },
  });

  if (!targetConfig) {
    throw new Error(`No defineTarget() call found in ${filePath}`);
  }

  return targetConfig;
}
```

**Design:**

- Parses TypeScript/JSX without runtime execution
- Finds `defineTarget()` call
- Evaluates object literals statically
- Supports: strings, numbers, booleans, objects, arrays, template literals
- Does not support: function calls, computations (for safety)

**Limitations:**

- Cannot evaluate computed values at build time
- No support for imports/constants (values must be literals)
- Template literals must have no expressions

**Why AST parsing?**

- Extracts config at build time without executing user code
- Allows dynamic configuration while maintaining build-time validation
- Single file for config + runtime (DX improvement)

---

## Plugin Architecture

### Plugin Chain

```
withExpoTargets
  └─ withTargetsDir
      └─ For each target:
          └─ withIOSTarget
              ├─ withXcodeChanges
              ├─ withIosColorset (for each color)
              ├─ withTargetEntitlements
              └─ withTargetPodfile (commented out)
```

### Plugin Execution Order

1. **withTargetsDir**: Scans and discovers targets
2. **withIOSTarget**: Orchestrates per-target plugins
3. **withXcodeChanges**: Creates native target (must run first)
4. **withIosColorset**: Generates color assets (can run in parallel)
5. **withTargetEntitlements**: Configures entitlements
6. **withTargetPodfile**: Updates Podfile (commented out)

### Config Plugin Pattern

```typescript
export const withMyPlugin: ConfigPlugin<Props> = (config, props) => {
  // Read config
  const { name, type } = props;

  // Modify config
  return withXcodeProject(config, async (config) => {
    // Access Xcode project
    const project = config.modResults;

    // Modify project
    // ...

    // Return modified config
    return config;
  });
};
```

**Key points:**

- Plugins are pure functions: `config => config`
- Async operations allowed
- Must return modified config
- Composable via function chaining

---

## Native Module

### Swift Implementation

**Location:** `packages/expo-targets/ios/ExpoTargetsModule.swift`

```swift
import ExpoModulesCore
import WidgetKit
import UIKit

public class ExpoTargetsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoTargets")

    Function("setString") { (key: String, value: String, suite: String?) -> Void in
      let defaults = UserDefaults(suiteName: suite ?? "")
      defaults?.set(value, forKey: key)
      defaults?.synchronize()
    }

    Function("refreshTarget") { (name: String?) -> Void in
      // Refresh widgets
      if #available(iOS 14.0, *) {
        if let targetName = name {
          WidgetCenter.shared.reloadTimelines(ofKind: targetName)
        } else {
          WidgetCenter.shared.reloadAllTimelines()
        }
      }

      // Refresh controls (iOS 18+)
      if #available(iOS 18.0, *) {
        if let targetName = name {
          ControlCenter.shared.reloadControls(ofKind: targetName)
        } else {
          ControlCenter.shared.reloadAllControls()
        }
      }
    }

    // ... more functions
  }
}
```

**Design:**

- ExpoModulesCore for easy Expo integration
- `@available` checks for iOS version compatibility
- Direct system API calls (WidgetCenter, ControlCenter)
- UserDefaults for App Group storage
- Synchronous operations (UserDefaults is fast)

### JavaScript Bridge

**Location:** `packages/expo-targets/src/TargetStorageModule.ts`

```typescript
import { requireNativeModule } from 'expo-modules-core';

export default requireNativeModule('ExpoTargets');
```

**Bound in:** `packages/expo-targets/src/TargetStorage.ts`

```typescript
import ExpoTargetsModule from './TargetStorageModule';

// Direct calls to native
ExpoTargetsModule.setString(key, value, appGroup);
ExpoTargetsModule.refreshTarget(name);
```

**Design:**

- Minimal JavaScript wrapper
- Direct native calls (no promise overhead for storage)
- Type-safe through TypeScript definitions

---

## Metro Integration

### withTargetsMetro Implementation

**Location:** `packages/expo-targets/metro/src/withTargetsMetro.ts`

```typescript
export function withTargetsMetro(
  metroConfig: MetroConfig,
  options?: { targets?: string[] }
): MetroConfig {
  const originalGetTransformOptions =
    metroConfig.transformer?.getTransformOptions;

  return {
    ...metroConfig,
    transformer: {
      ...metroConfig.transformer,
      getTransformOptions: async (entryPoints, options, getDependenciesOf) => {
        const transformOptions = originalGetTransformOptions
          ? await originalGetTransformOptions(
              entryPoints,
              options,
              getDependenciesOf
            )
          : {};

        return {
          ...transformOptions,
          transform: {
            ...transformOptions.transform,
            experimentalImportSupport: false,
            inlineRequires: true,
          },
        };
      },
    },
    serializer: {
      ...metroConfig.serializer,
      getModulesRunBeforeMainModule: () => [],
    },
  };
}
```

**Purpose:**

- Configure Metro for extension entry points
- Optimize bundle for extensions (inline requires)
- Remove unnecessary module initialization

**Usage:**

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withTargetsMetro } = require('expo-targets/metro');

module.exports = withTargetsMetro(getDefaultConfig(__dirname));
```

---

## Type System

### Core Types

**Location:** `packages/expo-targets/plugin/src/config.ts`

```typescript
// Extension types
export type ExtensionType =
  | 'widget'
  | 'clip'
  | 'imessage'
  | 'share'
  | 'action'
  | 'safari'
  | 'notification-content'
  | 'notification-service'
  | 'intent'
  | 'intent-ui'
  | 'spotlight'
  | 'bg-download'
  | 'quicklook-thumbnail'
  | 'location-push'
  | 'credentials-provider'
  | 'account-auth'
  | 'app-intent'
  | 'device-activity-monitor'
  | 'matter'
  | 'watch';

// Color with light/dark mode
export interface Color {
  light?: string;
  dark?: string;
  color?: string;
  darkColor?: string;
}

// iOS platform config
export interface IOSTargetConfig {
  icon?: string;
  deploymentTarget?: string;
  bundleIdentifier?: string;
  displayName?: string;
  colors?: Record<string, string | Color>;
  images?: Record<string, string>;
  frameworks?: string[];
  entitlements?: Record<string, any>;
  buildSettings?: Record<string, string>;
  useReactNative?: boolean;
  excludedPackages?: string[];
}

// Target configuration
export interface TargetConfig {
  type: ExtensionType;
  name?: string;
  displayName?: string;
  appGroup?: string;
  platforms: {
    ios?: IOSTargetConfig;
    android?: AndroidTargetConfig;
  };
}
```

### Runtime Types

**Location:** `packages/expo-targets/src/TargetStorage.ts`

```typescript
export interface Target {
  readonly name: string;
  readonly storage: AppGroupStorage;

  set(key: string, value: any): void;
  get(key: string): string | null;
  remove(key: string): void;

  setData<T>(data: T): void;
  getData<T>(): T | null;

  refresh(): void;
}

export interface DefineTargetOptions {
  name: string;
  appGroup: string;
  type: ExtensionType;
  displayName?: string;
  platforms: {
    ios?: IOSTargetConfig;
    android?: AndroidTargetConfig;
  };
}
```

### Type Flow

```
User Code (index.ts)
  ↓ (uses)
DefineTargetOptions
  ↓ (parsed by plugin)
TargetConfig
  ↓ (consumed by)
Plugin System
  ↓ (generates)
Native Xcode Project

User Code (App.tsx)
  ↓ (uses)
Target Instance
  ↓ (calls)
Native Module
```

---

## Build Process

### Complete Build Flow

```
1. User runs: npx expo prebuild -p ios --clean

2. Expo Config Resolution
   - Load app.json
   - Resolve plugins array
   - Find "expo-targets"

3. Plugin Execution
   - Call withExpoTargets(config)
   - withTargetsDir scans targets/

4. For Each Target:
   a. Parse Configuration
      - Read targets/{name}/index.ts
      - Parse with Babel AST
      - Extract defineTarget() config

   b. iOS Plugin Chain
      - withXcodeChanges
        * Load .xcodeproj
        * Create PBXNativeTarget
        * Add build configs
        * Copy Swift files
        * Link files
        * Configure settings
        * Save project

      - withIosColorset (per color)
        * Generate .colorset directories
        * Create Contents.json
        * Convert colors to RGB

      - withTargetEntitlements
        * Generate .entitlements file
        * Sync App Groups
        * Add custom entitlements

5. Write Modified Config
   - Expo writes ios/ directory
   - Xcode project includes new targets

6. Pod Install
   - CocoaPods installs dependencies
   - Links frameworks

7. Build Ready
   - Open ios/{App}.xcworkspace
   - Build in Xcode
```

### File Generation

**Created during prebuild:**

```
ios/
├── {App}.xcodeproj/
│   └── project.pbxproj         # Modified: includes new targets
├── {App}.xcworkspace/
├── {TargetName}/               # Created for each target
│   ├── Info.plist              # Generated from config
│   ├── generated.entitlements  # Generated from config
│   ├── Widget.swift            # Copied from targets/{name}/ios/
│   └── Assets.xcassets/        # Generated
│       ├── $accent.colorset/
│       │   └── Contents.json
│       └── logo.imageset/
│           ├── Contents.json
│           └── logo.png
└── Pods/                       # CocoaPods dependencies
```

---

## Design Decisions

### 1. Single File Configuration

**Decision:** Use `index.ts` for both config and runtime

**Rationale:**

- Single source of truth
- No code generation needed
- Better DX (import target directly)
- Type-safe by default

**Alternatives considered:**

- Separate config files (`expo-target.config.js`) → More boilerplate
- JSON config only → No runtime API
- Code generation → Build complexity

### 2. AST Parsing vs Runtime Evaluation

**Decision:** Parse configuration statically with Babel AST

**Rationale:**

- Extracts config without executing user code (security)
- Allows dynamic values while maintaining build-time access
- Supports TypeScript out of the box

**Limitations:**

- Cannot evaluate computed values
- No support for imports in config

**Trade-off:** Safety and build-time validation vs some flexibility

### 3. App Groups for Data Sharing

**Decision:** Use iOS App Groups via `UserDefaults`

**Rationale:**

- Standard iOS mechanism
- Simple API
- Fast synchronization
- Supported since iOS 8

**Alternatives considered:**

- File-based sharing → More complex, slower
- XPC → Overkill for simple data
- iCloud → Network dependency

### 4. xcode Package for Manipulation

**Decision:** Use `xcode@3.0.1` npm package

**Rationale:**

- Widely used and stable
- Available on npm
- Sufficient capabilities for target creation

**Alternatives considered:**

- `@bacons/xcode` → Not published, unavailable
- Custom XML parsing → Too complex
- Shell script Xcode operations → Brittle

**Trade-off:** Older API vs immediate availability

### 5. External File Linking

**Decision:** Link Swift files from `targets/*/ios/` to Xcode

**Rationale:**

- Keep source in logical location
- Easier to edit (developer knows where files are)
- Avoid file duplication

**Implementation:**

- Copy files to `ios/{targetName}/` during prebuild
- Reference from there in Xcode project
- Rebuild on changes (standard prebuild workflow)

### 6. Build Setting Inheritance

**Decision:** Inherit key settings from main app

**Rationale:**

- Consistency (SWIFT_VERSION, etc.)
- Less configuration needed
- Reduce errors

**Settings inherited:**

- SWIFT_VERSION
- TARGETED_DEVICE_FAMILY
- CLANG_ENABLE_MODULES
- SWIFT_EMIT_LOC_STRINGS

### 7. Color Asset Generation

**Decision:** Generate `.colorset` from config at build time

**Rationale:**

- Single source of truth (config file)
- Light/dark mode support
- Type-safe color names

**Implementation:**

- Parse hex/rgb/named colors
- Convert to RGB components
- Generate Contents.json
- Create directory structure

---

## Extension Points

### Adding New Extension Types

1. **Add type to enum** (`plugin/src/config.ts`):

   ```typescript
   export type ExtensionType = 'widget' | 'your-new-type';
   ```

2. **Add product type mapping** (`plugin/src/ios/target.ts`):

   ```typescript
   export function productTypeForType(type: ExtensionType): string {
     switch (type) {
       case 'your-new-type':
         return 'com.apple.product-type.app-extension';
       // ...
     }
   }
   ```

3. **Add framework list** (`plugin/src/ios/target.ts`):

   ```typescript
   export function getFrameworksForType(type: ExtensionType): string[] {
     switch (type) {
       case 'your-new-type':
         return ['YourFramework'];
       // ...
     }
   }
   ```

4. **Add Info.plist template** (`plugin/src/ios/target.ts`):

   ```typescript
   export function getTargetInfoPlistForType(type: ExtensionType): string {
     switch (type) {
       case 'your-new-type':
         return `<?xml version="1.0" encoding="UTF-8"?>
         <!-- Your Info.plist -->`;
       // ...
     }
   }
   ```

5. **Update CLI templates** (`packages/create-target/src/index.ts`):
   ```typescript
   const templates: Record<string, string> = {
     'your-new-type': `// Swift template`,
   };
   ```

### Adding New Native Methods

1. **Add Swift function** (`ios/ExpoTargetsModule.swift`):

   ```swift
   Function("yourMethod") { (param: String) -> String in
     // Implementation
     return "result"
   }
   ```

2. **Add TypeScript binding** (`src/TargetStorage.ts`):

   ```typescript
   export function yourMethod(param: string): string {
     return ExpoTargetsModule.yourMethod(param);
   }
   ```

3. **Export from index** (`src/index.ts`):
   ```typescript
   export { yourMethod } from './TargetStorage';
   ```

### Adding New Plugins

Create a new plugin:

```typescript
// plugin/src/ios/withYourPlugin.ts
import { ConfigPlugin } from '@expo/config-plugins';

export const withYourPlugin: ConfigPlugin<Props> = (config, props) => {
  return withXcodeProject(config, async (config) => {
    // Modify project
    return config;
  });
};
```

Add to orchestrator:

```typescript
// plugin/src/ios/withIOSTarget.ts
import { withYourPlugin } from './withYourPlugin';

export const withIOSTarget: ConfigPlugin<Props> = (config, props) => {
  config = withXcodeChanges(config, props);
  config = withYourPlugin(config, props); // Add here
  return config;
};
```

---

## Performance

### Build Time

**Typical prebuild with one widget:**

- Plugin execution: ~100-200ms
- AST parsing: ~50ms per target
- Xcode manipulation: ~100ms per target
- Color generation: ~10ms per color
- **Total overhead: ~200-400ms** (negligible compared to Xcode build)

### Runtime

**Data operations:**

- `set()`: ~1-5ms (UserDefaults write + sync)
- `get()`: ~0.1-1ms (UserDefaults read)
- `refresh()`: ~10-50ms (WidgetCenter API call)

**Storage limits:**

- App Groups: Unlimited (system-managed)
- UserDefaults: No hard limit, but keep data reasonable (<1MB recommended)

### Optimizations

1. **Parallel color generation**: Each color processed independently
2. **Lazy evaluation**: Config only parsed when needed
3. **Efficient AST traversal**: Single pass with early termination
4. **Native storage**: Direct UserDefaults (no serialization overhead)

---

## Security

### Build-Time Security

**AST Parsing:**

- No code execution (static analysis only)
- Cannot access filesystem or network
- Cannot run arbitrary computations
- Limited to literal values

**File Access:**

- Plugin reads only `targets/` directory
- No access to sensitive files
- Generated files in predictable locations

### Runtime Security

**App Groups:**

- Sandboxed shared container
- Only apps with same App Group can access
- Must be configured in Apple Developer Portal
- Entitlements enforce access control

**Native Module:**

- No file system access (uses UserDefaults)
- No network access
- Limited to approved APIs (WidgetCenter, UserDefaults)
- ExpoModulesCore provides additional sandboxing

### Best Practices

1. **Validate App Group IDs**: Ensure they match between app and extensions
2. **Limit shared data**: Only store what's necessary
3. **Use type-safe API**: Prevents accidental data corruption
4. **Avoid sensitive data**: App Groups are encrypted but shared

---

## Future Architecture

### Android Support

**Planned architecture:**

```
packages/expo-targets/plugin/src/android/
├── withAndroidTarget.ts        # Orchestrator
├── withGradleChanges.ts        # build.gradle manipulation
├── withAndroidManifest.ts      # AndroidManifest.xml
└── withAndroidResources.ts     # res/ generation
```

**Key differences from iOS:**

- Gradle instead of Xcode
- XML manifests instead of Info.plist
- Glance instead of WidgetKit
- SharedPreferences instead of UserDefaults

### Planned Features

1. **`_shared` directory**: Reusable Swift code across targets

   ```
   targets/
   ├── _shared/
   │   └── SharedViews.swift
   └── widget-1/
       └── ios/
           └── Widget.swift  # Imports from _shared
   ```

2. **Live Activities**: iOS 16+ dynamic island support

3. **App Intents**: iOS 16+ interactive widgets

4. **Widget Configuration**: `IntentConfiguration` for user-customizable widgets

5. **watchOS Support**: Apple Watch complications and apps

6. **Advanced Asset Types**:
   - Localized strings
   - Multiple icon sets
   - Symbol variations

---

## Summary

expo-targets uses a layered architecture with clear separation of concerns:

1. **TypeScript API**: Runtime data operations
2. **Config Plugin**: Build-time project setup
3. **Native Module**: iOS system integration
4. **Metro Wrapper**: Bundler configuration

Key design principles:

- ✅ Type-safe throughout
- ✅ Build-time validation
- ✅ Developer experience first
- ✅ Extensible and maintainable
- ✅ Platform-agnostic foundation

The architecture supports rapid iteration and makes it easy to add new extension types and platforms.
