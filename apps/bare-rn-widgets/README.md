# Bare RN Widgets

Example demonstrating widget development with expo-targets in a bare React Native workflow.

## Overview

This app shows how to use expo-targets with an existing bare React Native project that has a manually-managed `ios/` directory.

## Workflow: Bare React Native

Unlike the Expo managed workflow (which uses `expo prebuild`), the bare RN workflow uses `expo-targets sync` to add targets to your existing Xcode project.

### Setup Steps

1. **Ensure you have an existing iOS project**
   ```bash
   # Your project should already have an ios/ directory
   ls ios/
   ```

2. **Install expo-targets**
   ```bash
   npm install expo-targets
   # or
   bun add expo-targets
   ```

3. **Configure app.json**
   ```json
   {
     "expo": {
       "ios": {
         "entitlements": {
           "com.apple.security.application-groups": [
             "group.com.test.barernwidgets"
           ]
         }
       },
       "plugins": ["expo-targets"]
     }
   }
   ```

4. **Create target configuration**
   ```bash
   # Create targets/simple-widget/expo-target.config.json
   # See targets/simple-widget/expo-target.config.json in this app
   ```

5. **Sync targets to Xcode**
   ```bash
   npx expo-targets sync
   ```

   This command:
   - Scans `targets/*/expo-target.config.*` files
   - Adds targets to your existing Xcode project
   - Links Swift files from `targets/*/ios/`
   - Generates Info.plist, Assets, and entitlements
   - Configures build settings

6. **Install CocoaPods dependencies**
   ```bash
   cd ios
   pod install
   cd ..
   ```

7. **Build in Xcode**
   ```bash
   open ios/YourApp.xcworkspace
   # Select scheme and run
   ```

## Key Differences from Managed Workflow

| Managed Workflow | Bare RN Workflow |
|-----------------|------------------|
| `expo prebuild` generates entire `ios/` | `expo-targets sync` adds to existing `ios/` |
| `ios/` is generated, can be deleted | `ios/` is manually managed, don't delete |
| Full Xcode project regeneration | Incremental target addition |
| Works best for new projects | Works best for existing projects |

## File Structure

```
bare-rn-widgets/
├── ios/                    # Existing Xcode project (manually managed)
│   ├── YourApp.xcodeproj/
│   ├── Podfile
│   └── ...
├── targets/
│   └── simple-widget/
│       ├── expo-target.config.json
│       ├── index.ts
│       └── ios/
│           └── Widget.swift    # Referenced in place, not copied
├── app.json
└── package.json
```

## Important Notes

- **Don't delete `ios/` directory** - This is your manually managed project
- **Run `expo-targets sync`** after creating/modifying targets
- **Swift files stay in `targets/`** - They're referenced, not copied
- **Xcode project is modified** - Targets are added to your existing project
- **Pod install required** - After syncing, run `pod install`

## Troubleshooting

### Targets not appearing in Xcode?

1. Run `npx expo-targets sync` again
2. Check Xcode project was opened (close and reopen)
3. Verify `targets/*/expo-target.config.*` files exist

### Build errors?

1. Run `cd ios && pod install`
2. Clean build folder in Xcode (Cmd+Shift+K)
3. Verify App Group IDs match everywhere

### Sync not working?

1. Ensure `ios/` directory exists
2. Check `app.json` has expo-targets plugin
3. Verify target config files are valid JSON

## Next Steps

- See `bare-rn-share` for extension examples
- Compare with `widgets-showcase` (managed workflow)
- Check main docs for complete API reference

