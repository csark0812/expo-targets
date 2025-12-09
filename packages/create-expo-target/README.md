# create-expo-target

CLI tool for scaffolding expo-targets extensions.

> **Part of the expo-targets monorepo**. See the [main README](../../README.md) for complete documentation.

## Usage

```bash
npx create-expo-target
```

## What It Does

Interactive CLI that creates:

1. **Target directory**: `targets/{name}/`
2. **Configuration file**: `index.ts` with `defineTarget()`
3. **Swift template**: `ios/Widget.swift` (or appropriate for type)
4. **Entry file**: `index.{name}.js` (for React Native extensions)
5. **Asset directories**: For iMessage stickers, etc.

## Interactive Prompts

### 1. Target Type

Choose from:

- **Widget**: Home screen widgets (iOS 14+)
- **App Clip**: Lightweight app experiences (iOS 14+)
- **iMessage Stickers**: iMessage sticker packs (iOS 10+)
- **Share Extension**: Share content to your app (iOS 8+)
- **Action Extension**: Process content from other apps (iOS 8+)

More types coming soon!

### 2. Target Name

Directory name for your target (e.g., `my-widget`)

**Requirements:**

- Lowercase with hyphens preferred
- No spaces
- Will be used as bundle ID suffix

### 3. Platforms

Currently:

- **iOS**: ✅ Supported
- **Android**: 🔜 Coming soon

### 4. React Native (if applicable)

For compatible types (share, action, clip):

- Enables React Native rendering
- Creates entry file: `index.{name}.js`
- Configures Metro bundler

## Generated Structure

### Basic Widget

```
targets/
└── my-widget/
    ├── index.ts                 # Configuration + Runtime API
    └── ios/
        └── Widget.swift         # SwiftUI widget implementation
```

### Share Extension with React Native

```
targets/
└── share-extension/
    ├── index.ts                 # Configuration + Runtime API
    └── ios/
        └── ShareViewController.swift

index.share-extension.js         # React Native entry file
```

### iMessage Stickers

```
targets/
└── my-stickers/
    ├── index.ts
    └── ios/
        ├── Main.swift
        └── Stickers.xcstickers/  # Sticker assets directory
            └── Contents.json
```

## Generated Configuration

Creates `targets/{name}/index.ts`:

```typescript
import { defineTarget } from 'expo-targets';

export const MyWidget = defineTarget({
  name: 'my-widget',
  appGroup: 'group.com.yourapp', // Edit to match your App Group
  type: 'widget',
  displayName: 'My Widget',
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      colors: {
        $accent: '#007AFF',
      },
    },
  },
});

export type MyWidgetData = {
  message: string;
};
```

## Swift Templates

### Widget Template

Complete WidgetKit implementation with:

- `TimelineProvider` for data fetching
- `TimelineEntry` model
- SwiftUI `View`
- `@main Widget` configuration
- Preview provider

### App Clip Template

Basic SwiftUI App Clip with:

- `@main App` structure
- Content view
- Ready for customization

### iMessage Template

Placeholder for sticker pack setup.

### Share Extension Template

UIKit `ShareViewController` with:

- Basic UI setup
- Ready for React Native or native implementation

### Action Extension Template

UIKit `ActionViewController` with:

- Basic UI setup
- Ready for React Native or native implementation

## After Creation

### 1. Edit Configuration

Update App Group ID in `targets/{name}/index.ts`:

```typescript
appGroup: 'group.com.yourcompany.yourapp'; // Match your app.json
```

### 2. Customize Swift Code

Edit `targets/{name}/ios/*.swift` files to implement your logic.

### 3. Add to app.json

Ensure plugin is configured:

```json
{
  "expo": {
    "plugins": ["expo-targets"],
    "ios": {
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.yourcompany.yourapp"
        ]
      }
    }
  }
}
```

### 4. Prebuild

Generate native projects:

```bash
npx expo prebuild -p ios --clean
```

### 5. Build

```bash
npx expo run:ios
```

## For React Native Extensions

If you chose React Native:

### 1. Create Entry File

Already created as `index.{name}.js`:

```javascript
import { AppRegistry } from 'react-native';
import ShareExtension from './src/ShareExtension';

AppRegistry.registerComponent('shareExtension', () => ShareExtension);
```

### 2. Wrap Metro Config

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withTargetsMetro } = require('expo-targets/metro');

module.exports = withTargetsMetro(getDefaultConfig(__dirname));
```

### 3. Build in Release Mode

React Native extensions only work in Release builds:

```bash
npx expo run:ios --configuration Release
```

## Development

### Build

```bash
cd packages/create-expo-target
bun run build
```

### Test Locally

```bash
# Link globally
npm link

# Use in any Expo project
create-expo-target
```

## Command Line Options

Currently interactive only. Command-line options coming soon:

```bash
# Planned
npx create-expo-target --type widget --name my-widget --platforms ios
```

## Templates

Templates are embedded in the CLI source code:

- `src/index.ts` contains all template strings
- Templates use placeholders for customization
- Easy to add new templates

## Requirements

- Node.js 16+ or Bun
- Expo project
- Write access to project directory

## Version

Current version: **0.2.0**

See [CHANGELOG.md](../../CHANGELOG.md) for version history.

## Documentation

- **[Getting Started](../../docs/getting-started.md)**: Full tutorial
- **[Config Reference](../../docs/config-reference.md)**: Configuration options
- **[Main README](../../README.md)**: Project overview

## License

[MIT](../../LICENSE)

## Credits

Part of expo-targets by [Your Organization]
