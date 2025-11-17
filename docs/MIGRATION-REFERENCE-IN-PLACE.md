# Migration Guide: Reference-in-Place Architecture

## Overview

This guide covers the migration from the old "copy-files" approach to the new "reference-in-place" architecture in expo-targets. This is a **breaking change** that fundamentally changes how expo-targets manages native code files.

## What Changed

### Old Approach (Pre-1.0)

```
targets/my-widget/
  └── ios/Widget.swift           [Source]

ios/WeatherWidget/
  └── Widget.swift                [Copy - created by prebuild]
  └── Info.plist                  [Copy - created by prebuild]
  └── Assets.xcassets/            [Copy - created by prebuild]
```

Files were **copied** from `targets/` to `ios/` during prebuild.

### New Approach (1.0+)

```
targets/my-widget/
  ├── ios/
  │   └── Widget.swift            [Source - referenced in place]
  └── ios/build/                  [Generated artifacts]
      ├── Info.plist              [Generated - referenced in place]
      ├── Assets.xcassets/        [Generated - referenced in place]
      └── ReactNativeViewController.swift  [Generated if using RN]

Xcode Project:
  └── expo:targets/               [Virtual group]
      └── my-widget/              [References point to targets/]
```

Files are **referenced in place** - Swift code stays in `targets/`, generated metadata goes to `targets/TARGETNAME/ios/build/`.

## Why This Change?

1. **Single Source of Truth**: Edit in Xcode or VS Code - changes save to the same location
2. **No Duplication**: Swift files exist only once
3. **Bare RN Compatible**: Enables sync CLI for bare React Native projects
4. **Cleaner Separation**: User code in `targets/*/ios/`, generated files in `targets/*/ios/build/`
5. **Matches @bacons/apple-targets**: Industry-standard approach

## Breaking Changes

### 1. File Locations

❌ **Old**: Files in `ios/TargetName/`
✅ **New**: Files referenced from `targets/target-name/ios/` and `targets/target-name/ios/build/`

### 2. Xcode Navigator

❌ **Old**: Files appear in `TargetName` group in iOS folder
✅ **New**: Files appear in virtual `expo:targets/TargetName` group

### 3. Generated Files Location

❌ **Old**: `ios/TargetName/Info.plist`
✅ **New**: `targets/target-name/ios/build/Info.plist`

❌ **Old**: `ios/TargetName/Assets.xcassets/`
✅ **New**: `targets/target-name/ios/build/Assets.xcassets/`

### 4. Build Settings

**INFOPLIST_FILE** now points to targets directory:

```
Old: "WeatherTarget/Info.plist"
New: "../../targets/weather-widget/ios/build/Info.plist"
```

**CODE_SIGN_ENTITLEMENTS** now points to targets directory:

```
Old: "WeatherTarget/generated.entitlements"
New: "../../targets/weather-widget/ios/build/generated.entitlements"
```

## Migration Steps

### For Existing Projects

1. **Clean up old files**:

   ```bash
   # Remove old copied files in ios/
   rm -rf ios/WeatherTarget
   rm -rf ios/MyClipTarget
   # etc for each target
   ```

2. **Update expo-targets**:

   ```bash
   npm install expo-targets@latest
   # or
   bun add expo-targets@latest
   ```

3. **Run prebuild**:

   ```bash
   npx expo prebuild -p ios --clean
   ```

4. **Verify in Xcode**:
   - Open project in Xcode
   - Look for `expo:targets` group in navigator
   - Verify files show correct paths (../../targets/...)
   - Build and test

5. **Update .gitignore** (if custom):
   ```gitignore
   # Add to your .gitignore
   targets/*/ios/build/
   targets/*/android/build/
   ```

### For New Projects

No migration needed! Just install expo-targets 1.0+ and follow the standard setup:

```bash
npm install expo-targets
npx create-target
npx expo prebuild -p ios --clean
```

## Troubleshooting

### "Swift file not found" Error

**Problem**: `Swift file not found: targets/my-widget/ios/Widget.swift`

**Solution**: Ensure your Swift files exist in `targets/my-widget/ios/`, not in `ios/MyWidgetTarget/`

### Build Fails with Missing Info.plist

**Problem**: `The file "Info.plist" couldn't be opened`

**Solution**:

1. Delete `ios/` directory
2. Run `npx expo prebuild --clean`
3. Info.plist should now generate in `targets/*/ios/build/Info.plist`

### Xcode Shows Red Files

**Problem**: Files appear red in Xcode navigator

**Solution**:

1. Check file actually exists in `targets/` directory
2. Verify relative path is correct
3. Clean Xcode: Product → Clean Build Folder
4. Re-run `npx expo prebuild --clean`

### Changes in Xcode Don't Persist

**Problem**: Edit in Xcode, changes disappear after prebuild

**Solution**: This shouldn't happen anymore! Changes in Xcode should save to `targets/` directly. If this occurs:

1. Verify files in `expo:targets` group are references (not copies)
2. Check file paths in Xcode File Inspector
3. Ensure prebuild isn't removing/recreating files

### "expo:targets" Group Missing

**Problem**: Don't see virtual expo:targets group in Xcode

**Solution**:

1. Update expo-targets to 1.0+
2. Run `npx expo prebuild -p ios --clean`
3. Group should appear at project root level

## Compatibility

### Expo Managed Workflow (CNG)

✅ **Fully Compatible**: Just update expo-targets and run prebuild

```bash
npm install expo-targets@latest
npx expo prebuild --clean
```

### Bare React Native

✅ **Compatible with Sync CLI**: Use the new sync command

```bash
npm install expo-targets@latest
npx expo-targets sync
cd ios && pod install
```

### EAS Build

✅ **Fully Compatible**: EAS Build runs prebuild automatically

```bash
eas build --platform ios
```

### Local Xcode Development

✅ **Enhanced**: Edit files in Xcode, changes save to `targets/` directly

## Rollback

If you encounter issues and need to rollback:

1. **Downgrade package**:

   ```bash
   npm install expo-targets@0.x.x  # Last pre-1.0 version
   ```

2. **Clean and rebuild**:

   ```bash
   rm -rf ios/
   npx expo prebuild -p ios --clean
   ```

3. **Report issue**: Please report the problem on GitHub so we can fix it

## FAQ

### Q: Do I need to change my Swift code?

**A:** No! Swift code remains unchanged. Only the file locations and Xcode project structure change.

### Q: Will this work in bare React Native?

**A:** Yes! Use the new `npx expo-targets sync` command for bare RN projects.

### Q: Can I still manually edit Xcode projects?

**A:** Yes, but changes will be overwritten by prebuild. Use the sync CLI for bare RN if you need manual Xcode control.

### Q: What about Android?

**A:** Android support is unchanged. This primarily affects iOS file organization.

### Q: Do prebuild times change?

**A:** Roughly the same. Slightly faster since we're not copying files, but the difference is negligible.

### Q: What about React Native share/action extensions?

**A:** They work the same way. Generated ReactNativeViewController goes to `targets/*/ios/build/` and is referenced from there.

## Benefits You'll Experience

1. **Faster Development**: Edit in Xcode or VS Code seamlessly
2. **No Sync Issues**: One copy of each file eliminates synchronization problems
3. **Better Git Workflow**: Only track source files, not generated copies
4. **Cleaner Project**: Clear separation between user code and generated artifacts
5. **Bare RN Support**: Can now use expo-targets without full CNG workflow

## Need Help?

- **Documentation**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- **GitHub Issues**: [Report problems](https://github.com/your-org/expo-targets/issues)
- **Examples**: Check `apps/` directory for working examples

## Next Steps

After migration:

1. Test your widgets/extensions thoroughly
2. Update your team's documentation
3. Consider using the sync CLI if you're in a bare RN project
4. Enjoy the improved workflow!
