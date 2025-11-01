# Android Implementation Comparison: android-impl-composer vs android-impl-claude

## Overview

Both branches implement Android widget support, but with different architectural approaches:

- **android-impl-composer**: Full iOS API parity approach
- **android-impl-claude**: Simplified API matching the plan exactly

## Key Differences

### 1. Native Module API Design

#### android-impl-claude (Simpler)
- **Storage Module**: Simple API with 3 methods
  - `set(widgetName, key, value)` 
  - `get(widgetName, key)`
  - `remove(widgetName, key)`
- Matches the plan exactly

#### android-impl-composer (Full API)
- **Storage Module**: Complete API matching iOS
  - `setInt(key, value, widgetName)`
  - `setString(key, value, widgetName)`
  - `setObject(key, value, widgetName)`
  - `get(key, widgetName)`
  - `remove(key, widgetName)`
  - `getAllKeys(widgetName)`
  - `getAllData(widgetName)`
  - `clearAll(widgetName)`
  - `refreshTarget(targetName)`
  - `getTargetsConfig()`
- Provides full feature parity with iOS

### 2. TypeScript Module Wrappers

#### android-impl-claude
- **Has dedicated wrapper modules**:
  - `packages/expo-targets/src/modules/ExpoTargetsStorageModule.ts`
  - `packages/expo-targets/src/modules/ExpoTargetsExtensionModule.ts`
- These wrappers provide cross-platform abstraction
- Platform detection happens in TypeScript layer
- Cleaner separation of concerns

#### android-impl-composer
- **No wrapper modules**
- Uses native modules directly from `storage/index.ts`
- Platform detection in `AppGroupStorage` class
- More direct but less abstraction

### 3. ExpoTargets.ts Implementation

#### android-impl-claude
```typescript
import ExpoTargetsExtensionModule from './modules/ExpoTargetsExtensionModule';

export const ExpoTargets = {
  get capabilities(): Capabilities {
    return {
      supportsGlance: ExpoTargetsExtensionModule.supportsGlance,
      platformVersion: ExpoTargetsExtensionModule.platformVersion,
    };
  },
};
```
- Uses wrapper module
- Simpler implementation

#### android-impl-composer
```typescript
const ExpoTargetsExtensionModule = requireNativeModule('ExpoTargetsExtension');

export const ExpoTargets = {
  get capabilities(): Capabilities {
    if (Platform.OS === 'android') {
      return {
        supportsGlance: ExpoTargetsExtensionModule.supportsGlance ?? false,
        platformVersion: ExpoTargetsExtensionModule.platformVersion ?? 0,
      };
    }
    return { supportsGlance: false, platformVersion: 0 };
  },
};
```
- Direct native module access
- Explicit platform checks

### 4. Storage Module Integration

#### android-impl-claude
- Uses wrapper module that handles platform differences
- `AppGroupStorage` calls wrapper which routes to correct native API

#### android-impl-composer
- `AppGroupStorage` directly calls native module
- Platform detection via `getStorageKey()` method
- Uses same API signature for both platforms (parameter order differs)

### 5. Config Plugin Differences

#### android-impl-claude
- More detailed widget XML generation
- Better handling of optional fields (maxResizeWidth, maxResizeHeight, targetCellWidth, targetCellHeight)
- Uses array for meta-data (more correct XML structure)
- Path resolution for user code copying handled differently

#### android-impl-composer
- Simpler XML generation
- All fields in template string
- Uses object for meta-data
- Explicit projectRoot resolution for paths

### 6. Receiver Implementation

#### android-impl-claude
- More complete refresh implementation
- Better error handling

#### android-impl-composer
- Basic refresh implementation
- Simpler error handling

### 7. Documentation

#### android-impl-claude
- Includes `ANDROID_WIDGET_IMPLEMENTATION_COMPLETE.md`
- Comprehensive documentation of implementation

#### android-impl-composer
- No dedicated documentation file

## Recommendation

**For MVP/Initial Release**: **android-impl-claude** approach
- Simpler API matches the plan
- Better separation with wrapper modules
- Easier to understand and maintain
- Good documentation

**For Full Feature Parity**: **android-impl-composer** approach
- Complete API matching iOS
- More features available immediately
- Better for existing iOS users migrating to Android

## Merge Strategy

Consider combining the best of both:
1. Use **composer's** full API (setInt, setString, etc.) for feature parity
2. Use **claude's** wrapper modules for cleaner abstraction
3. Use **claude's** improved plugin XML generation
4. Use **claude's** documentation
