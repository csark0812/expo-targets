# Bug Report: iOS Build Failure with Standalone Share Extension

## Symptoms

When building an Expo project with a standalone (non-React Native) share extension on iOS, the build fails with multiple linker errors:

```
ld: object file (...libPods-shareextension.a...) was built for newer 'iOS-simulator' version (17.0) than being linked (15.1)
ld: Could not find or use auto-linked framework 'UIUtilities': framework 'UIUtilities' not found
ld: Could not parse or use implicit file '.../SwiftUICore.framework/SwiftUICore.tbd': cannot link directly with 'SwiftUICore' because product being built is not an allowed client of it
ld: symbol(s) not found for architecture arm64
clang: error: linker command failed with exit code 1
```

## Environment

- **Platform**: macOS with case-insensitive filesystem (APFS default)
- **Build System**: Xcode via Expo prebuild
- **Package Manager**: CocoaPods
- **Target Configuration**:
  - Main app: React Native with Expo
  - Extension: Standalone share extension (no React Native, pure Swift)
  - App deployment target in `app.json`: iOS 17.0
  - Podfile platform default: iOS 15.1

## Root Causes Identified

### 1. Podfile `use_frameworks!` Configuration Issues

**Issue 1a**: The `withPodfile` config plugin unconditionally called `ensureMainTargetUsesFrameworks()` for ALL targets, including standalone extensions. This added `use_frameworks! :linkage => :static` to the main app target regardless of whether it was needed.

**Issue 1b**: The `generateStandaloneTargetBlock()` function generated Podfile blocks with `use_frameworks! :linkage => :static` for standalone extension targets.

**Problem**: CocoaPods requires that a host app and its embedded extensions either BOTH use frameworks or BOTH use static libraries. When standalone extensions have no pod dependencies but declare `use_frameworks!`, CocoaPods creates an empty `Pods_ShareExtension.framework` anyway. This causes inconsistencies because:

- Standalone extensions don't need `use_frameworks!` (they have no pod dependencies)
- Adding it to the main app unnecessarily forces all pods to be built as frameworks
- Mixed configurations cause build setting conflicts

### 2. Filesystem Case-Sensitivity Collision

**Issue**: On macOS's default case-insensitive filesystem (APFS), directory name conflicts occur:

- Main app directory: `shareextension` (lowercase, project name)
- Extension directory generated: `ShareExtension` (PascalCase, from display name "Share Extension")
- Result: Both paths resolve to the SAME physical directory

**Impact**:

- Extension Swift files (`ShareViewController.swift`) are placed in the main app's directory
- Main app build tries to compile extension code
- Main app attempts to link extension-specific frameworks (Social, MobileCoreServices)
- Xcode project references incorrect file paths

**Code location**: `packages/expo-targets/plugin/src/ios/utils/paths.ts` - `getTargetGroupPath()` function uses `sanitizeTargetName()` which removes non-alphanumeric characters but doesn't account for case-insensitive filesystems.

### 3. Xcode Build Settings Path References

**Issue**: After creating target directories, Xcode build settings referenced paths using only the sanitized product name (e.g., `"ShareExtension/Info.plist"`), but the actual files were placed in directories with different names on disk due to collision workarounds.

**Affected settings**:

- `INFOPLIST_FILE`
- `CODE_SIGN_ENTITLEMENTS`

**Impact**: Xcode cannot find required files during build, causing "Build input file cannot be found" errors.

### 4. Deployment Target Version Mismatch

**Issue**: The generated Podfile defaults to iOS 15.1 when `Podfile.properties.json` doesn't contain `ios.deploymentTarget`:

```ruby
platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'
```

However, `app.json` specifies:

```json
"ios": {
  "deploymentTarget": "17.0"
}
```

**Problem**: This creates a mismatch where:

- Extension target explicitly sets deployment target to 17.0 (from config)
- Main app platform defaults to 15.1
- Pods are built for the extension's 17.0 target
- Main app tries to link against pods built for 17.0 while targeting 15.1

**Root cause**: Expo's prebuild process doesn't populate `Podfile.properties.json` with the deployment target from `app.json`, and the Podfile template uses a hardcoded fallback.

## Build Sequence Leading to Failure

1. **Prebuild phase**:
   - Main app target created: `shareextension`
   - Extension target created: `ShareExtension` (should be separate directory)
   - On case-insensitive filesystem: Both resolve to same directory
   - Extension files mixed with main app files

2. **CocoaPods installation**:
   - Podfile has conflicting `use_frameworks!` settings
   - Main app gets `use_frameworks!` (unnecessary)
   - Extension gets `use_frameworks!` (has no pods)
   - Empty `Pods_ShareExtension` framework created
   - Deployment target defaults to 15.1 for platform

3. **Xcode build**:
   - Main app compiles extension Swift files (wrong)
   - Main app tries to link extension frameworks (wrong)
   - Extension built for 17.0, main app for 15.1 (mismatch)
   - Linker fails due to architecture/version incompatibilities

## Reproduction Steps

1. Create Expo project with `ios.deploymentTarget: "17.0"` in `app.json`
2. Add standalone share extension target with `displayName: "Share Extension"`
3. Don't specify `ios.deploymentTarget` in `Podfile.properties.json` (rely on default)
4. Run `npx expo prebuild --platform ios --clean`
5. Run `npx expo run:ios`
6. Observe linker errors

## Expected Behavior

- Standalone extensions should build independently without affecting main app
- Extension files should be isolated in separate directories
- Deployment targets should be consistent across all targets
- No unnecessary `use_frameworks!` directives

## Actual Behavior

- Build fails with linker errors
- Extension files mixed with main app files
- Deployment target mismatches
- CocoaPods configuration conflicts
