# expo-targets

Add iOS widgets, App Clips, iMessage stickers, and other native extensions to your Expo app with a simple, type-safe API.

> **Part of the expo-targets monorepo**. See the [main README](../../README.md) for complete documentation.

## Quick Start

```bash
bun add expo-targets
```

```typescript
// targets/hello-widget/index.ts
import { defineTarget } from 'expo-targets';

export const HelloWidget = defineTarget({
  name: 'hello-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      colors: {
        $accent: '#007AFF',
      },
    },
  },
});

export type HelloWidgetData = {
  message: string;
};
```

```typescript
// App.tsx
import { HelloWidget } from './targets/hello-widget';

HelloWidget.set('message', 'Hello Widget!');
HelloWidget.refresh();
```

## Package Structure

This package contains four components:

### 1. TypeScript API (`src/`)

Runtime API for data sharing and widget control.

```typescript
import {
  defineTarget,
  refreshAllTargets,
  close,
  openHostApp,
} from 'expo-targets';
```

**Exports:**

- `defineTarget(options)`: Create type-safe target instance
- `TargetStorage`: Legacy storage class
- `AppGroupStorage`: Low-level storage class
- `refreshAllTargets()`: Refresh all widgets/controls
- `close()`: Close extension (share/action)
- `openHostApp(path)`: Open main app from extension
- `clearSharedData()`: Clear shared data

### 2. Config Plugin (`plugin/`)

Expo config plugin for automatic Xcode project setup.

```json
{
  "expo": {
    "plugins": ["expo-targets"]
  }
}
```

**Features:**

- Scans `targets/*/index.ts` for `defineTarget()` calls
- Parses configuration using Babel AST
- Creates native Xcode targets
- Links Swift files from `targets/*/ios/`
- Generates color and image assets
- Syncs entitlements from main app
- Configures frameworks and build settings

### 3. Metro Wrapper (`metro/`)

Metro bundler wrapper for React Native extensions.

```typescript
import { withTargetsMetro } from 'expo-targets/metro';
```

**Usage:**

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withTargetsMetro } = require('expo-targets/metro');

module.exports = withTargetsMetro(getDefaultConfig(__dirname));
```

**Required for:**

- Share extensions with React Native
- Action extensions with React Native
- App Clips with React Native

### 4. Native Module (`ios/`)

Swift module for data storage and widget lifecycle.

**Capabilities:**

- App Group storage via `UserDefaults`
- Widget refresh (`WidgetCenter` API)
- Control Center refresh (iOS 18+)
- Extension lifecycle management
- Deep linking to main app

## Exports

### Main Package

```typescript
// Core API
import {
  defineTarget,
  TargetStorage,
  AppGroupStorage,
  refreshAllTargets,
  close,
  openHostApp,
  clearSharedData,
} from 'expo-targets';

// Types
import type {
  Target,
  DefineTargetOptions,
  TargetConfig,
  IOSTargetConfig,
  AndroidTargetConfig,
  ExtensionType,
  Color,
} from 'expo-targets';
```

### Metro Subpath

```typescript
import { withTargetsMetro } from 'expo-targets/metro';
```

## Development

### Build

```bash
bun run build        # Build all components
bun run build:main   # Build TypeScript API
bun run build:plugin # Build config plugin
bun run build:metro  # Build Metro wrapper
```

### Clean

```bash
bun run clean        # Remove all build artifacts
```

### Lint

```bash
bun run lint         # Lint source code
```

## Documentation

- **[Getting Started](../../docs/getting-started.md)**: Step-by-step tutorial
- **[API Reference](../../docs/api-reference.md)**: Complete API documentation
- **[Config Reference](../../docs/config-reference.md)**: Configuration options
- **[TypeScript Guide](../../docs/typescript-config-guide.md)**: Advanced patterns
- **[Main README](../../README.md)**: Project overview

## Examples

- **[widget-basic](../../apps/widget-basic/)**: Complete working widget with data sharing

## Features

- 🎯 **Type-Safe API**: Full TypeScript support with IDE autocomplete
- 📦 **Simple Configuration**: Single `index.ts` file per target
- 🔄 **Data Sharing**: Built-in App Group storage
- ⚛️ **React Native**: Optional RN rendering in compatible extensions
- 🎨 **Asset Generation**: Automatic colors and images
- 🔧 **Xcode Integration**: Full project manipulation
- 📱 **iOS Production Ready**: Widgets, clips, iMessage tested

## Platform Support

- **iOS**: ✅ Production ready (iOS 14+)
- **Android**: 📋 Coming soon (architecture prepared)

## Requirements

- Expo SDK 50+
- iOS 14+ (for widgets)
- macOS with Xcode 14+
- TypeScript recommended

## Version

Current version: **0.1.0**

See [CHANGELOG.md](../../CHANGELOG.md) for version history.

## License

[MIT](../../LICENSE)

## Contributing

See [Contributing Guide](../../CONTRIBUTING.md) (coming soon)

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/expo-targets/issues)
- **Documentation**: [docs/](../../docs/)
- **Examples**: [apps/](../../apps/)

## Credits

Part of expo-targets by [Your Organization]

Inspired by [@bacons/apple-targets](https://github.com/EvanBacon/expo-apple-targets), [expo-widgets](https://github.com/bittingz/expo-widgets), and others.
