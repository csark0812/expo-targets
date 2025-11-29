# @expo-targets/cli

CLI tool for syncing `expo-targets` configurations to bare React Native projects.

## Installation

```bash
npm install -g @expo-targets/cli
# or use with npx
npx @expo-targets/cli sync
```

## Usage

### Sync Command

Synchronize targets from `targets/` directory to your Xcode project:

```bash
expo-targets sync [options]
```

#### Options

- `--clean` - Remove orphaned targets from Xcode project
- `--dry-run` - Show what would change without writing files
- `-v, --verbose` - Enable verbose logging
- `--targets-root <path>` - Custom targets directory (default: `./targets`)

#### Examples

```bash
# Basic sync
expo-targets sync

# Dry run to preview changes
expo-targets sync --dry-run

# Clean up orphaned targets
expo-targets sync --clean

# Verbose output
expo-targets sync -v

# Custom targets directory
expo-targets sync --targets-root ./my-targets
```

## How It Works

The CLI tool applies the same transformations as `expo prebuild` but directly to your existing `ios/` folder:

1. Reads target configurations from `targets/*/expo-target.config.json`
2. Updates Xcode project to reference files in place
3. Creates virtual `expo:targets` folder structure in Xcode
4. Updates Podfile with target-specific configurations
5. Generates build artifacts in `targets/*/ios/build/`

## Workflow

### For Bare React Native Projects

1. Install expo-targets:
   ```bash
   npm install expo-targets
   ```

2. Create a target:
   ```bash
   npx create-expo-target
   ```

3. Sync to Xcode:
   ```bash
   npx expo-targets sync
   ```

4. Install pods:
   ```bash
   cd ios && pod install
   ```

5. Build in Xcode or via CLI

### After Making Changes

Run `expo-targets sync` again after:
- Adding new targets
- Modifying target configurations
- Changing target names or types
- Adding/removing Swift files

## Comparison with Prebuild

| Feature | `expo prebuild` | `expo-targets sync` |
|---------|----------------|---------------------|
| Workflow | Expo Managed (CNG) | Bare React Native |
| Target | Regenerates `ios/` | Updates existing `ios/` |
| Frequency | Before each build | After config changes |
| Safety | Destructive (clean) | Additive (preserves manual changes) |

## Troubleshooting

### Command Not Found

Make sure the package is installed globally or use `npx`:
```bash
npm install -g @expo-targets/cli
```

### No Xcode Project Found

The command must be run from your React Native project root (where `ios/` directory exists).

### Sync Doesn't Update Changes

Try running with `--clean` to remove stale references:
```bash
expo-targets sync --clean
```

## Requirements

- Node.js 16+
- iOS project in `ios/` directory
- CocoaPods installed

## License

MIT

