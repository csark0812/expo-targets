# Expo Config Pattern Migration

This document explains the new Expo-style configuration pattern for `expo-targets`, inspired by [Evan Bacon's `expo-apple-targets`](https://github.com/EvanBacon/expo-apple-targets).

## Philosophy

Following Expo's design principles:

- **Separation of concerns**: Configuration separate from runtime code
- **Familiar patterns**: Similar to `expo-module.config.json`
- **Type safety**: TypeScript support for configs
- **Simplicity**: No complex AST parsing required

## New Pattern

### Directory Structure

```
targets/
  └── checkout-clip/
      ├── expo-target.config.ts  (or .js, .json)
      └── index.ts
```

### Configuration File

**`targets/checkout-clip/expo-target.config.ts`:**

```typescript
import type { TargetConfig } from 'expo-targets';

const config: TargetConfig = {
  type: 'clip',
  name: 'CheckoutClip',
  displayName: 'Quick Checkout',
  platforms: ['ios'],
  appGroup: 'group.com.test.clipadvanced',
  ios: {
    deploymentTarget: '17.0',
    bundleIdentifier: 'com.test.clipadvanced.clip',
    displayName: 'Quick Checkout',
    colors: {
      AccentColor: { light: '#007AFF', dark: '#0A84FF' },
      BackgroundColor: { light: '#FFFFFF', dark: '#000000' },
      PrimaryText: { light: '#000000', dark: '#FFFFFF' },
    },
    entitlements: {
      'com.apple.developer.associated-domains': [
        'appclips:clipadvanced.example.com',
      ],
      'com.apple.developer.on-demand-install-capable': true,
    },
  },
};

export default config;
```

### Runtime Code

**`targets/checkout-clip/index.ts`:**

```typescript
import { createTarget } from 'expo-targets';

// Just the name - exactly like requireNativeModule('Name')
export const checkoutClip = createTarget('CheckoutClip');

// Your runtime logic
export const storeCheckoutData = async (itemId: string, price: number) => {
  await checkoutClip.set('lastItemId', itemId);
  await checkoutClip.set('lastPrice', price.toString());
};

export const getCheckoutHistory = async () => {
  const itemId = await checkoutClip.get('lastItemId');
  const price = await checkoutClip.get('lastPrice');
  return { itemId, price: price ? parseFloat(price) : null };
};
```

## Old Pattern (Deprecated)

### Before

**`targets/checkout-clip/index.ts`:**

```typescript
import { defineTarget } from 'expo-targets';

// Configuration embedded in runtime code
export const checkoutClip = defineTarget({
  type: 'clip',
  name: 'CheckoutClip',
  displayName: 'Quick Checkout',
  platforms: ['ios'],
  appGroup: 'group.com.test.clipadvanced',
  ios: {
    deploymentTarget: '17.0',
    bundleIdentifier: 'com.test.clipadvanced.clip',
    // ... more config
  },
});

// Runtime logic mixed with config
export const storeCheckoutData = async (itemId: string, price: number) => {
  await checkoutClip.set('lastItemId', itemId);
};
```

## Migration Steps

1. **Create config file**: Create `expo-target.config.ts` (or `.js`) in your target directory
2. **Move configuration**: Copy your `defineTarget()` object to the config file
3. **Export as default**: Add `export default config;`
4. **Update index file**: Replace `defineTarget()` with `createTarget()`
5. **Rebuild**: Run `npx expo prebuild --clean`

## Benefits

### Cleaner Separation

- Configuration in one place
- Runtime logic not cluttered with config
- Easier to review config changes in git

### Better Developer Experience

- TypeScript IntelliSense for config files
- No AST parsing complexity
- Config files are static and simple

### Aligns with Expo Ecosystem

- Matches `expo-module.config.json` pattern
- Familiar to Expo developers
- Follows [expo-apple-targets](https://github.com/EvanBacon/expo-apple-targets) conventions

## Config File Formats

All formats supported:

### TypeScript (Recommended)

```typescript
// expo-target.config.ts
import type { TargetConfig } from 'expo-targets';

const config: TargetConfig = {
  type: 'widget',
  name: 'MyWidget',
  // ...
};

export default config;
```

### JavaScript

```javascript
// expo-target.config.js
module.exports = {
  type: 'widget',
  name: 'MyWidget',
  // ...
};
```

### JSON

```json
{
  "type": "widget",
  "name": "MyWidget"
}
```

## How It Works

Similar to how Expo Modules separates build-time config from runtime code:

**Build Time (`npx expo prebuild`):**

1. Config plugin finds `expo-target.config.{ts,js,json}` files in `targets/*/`
2. Reads full configuration (bundleId, colors, entitlements, etc)
3. Generates and links Xcode/Android target projects
4. Similar to `expo-module.config.json` for native modules

**Runtime (React Native app):**

1. Your code calls `createTarget('MyWidget')` - just a string name!
2. AppGroup is auto-detected from `app.json` entitlements
3. Returns a `Target` instance for storage operations
4. Uses native module via `requireNativeModule('ExpoTargets')`

## Example: Widget Target

**`targets/hello-widget/expo-target.config.ts`:**

```typescript
import type { TargetConfig } from 'expo-targets';

const config: TargetConfig = {
  type: 'widget',
  name: 'HelloWidget',
  displayName: 'Hello Widget',
  platforms: ['ios'],
  ios: {
    deploymentTarget: '17.0',
    bundleIdentifier: 'com.example.app.widget',
  },
};

export default config;
```

**`targets/hello-widget/index.ts`:**

```typescript
import { createTarget } from 'expo-targets';

export const helloWidget = createTarget('HelloWidget');

export const updateWidgetData = async (message: string) => {
  await helloWidget.setData({ message, updatedAt: Date.now() });
  helloWidget.refresh();
};
```

## Notes

- **Config files** (`expo-target.config`) are only used at build time by the config plugin
- **Runtime code** (`index.ts`) only needs `name` - everything else is auto-detected!
  - `appGroup` is read from `app.json` entitlements at runtime (via `expo-constants`)
  - Build config (bundleId, colors, etc) was already applied by config plugin
- This mirrors Expo Modules pattern: `expo-module.config.json` (build) + `requireNativeModule('Name')` (runtime)
- The config plugin automatically detects and processes all targets in the `targets/` directory

## Why Separate Build and Runtime Config?

**Similar to Expo Native Modules:**

```typescript
// Build time: expo-module.config.json tells autolinking what to link
{ "platforms": ["ios"], "ios": { "modules": ["ExpoTargets"] } }

// Runtime: Just use the module by name
const module = requireNativeModule('ExpoTargets');
```

**Your Target System:**

```typescript
// Build time: expo-target.config.ts tells config plugin what to generate
{ type: 'clip', ios: { bundleIdentifier, colors, entitlements } }

// Runtime: Just use the target by name
const target = createTarget('CheckoutClip');
```

Both follow **separation of concerns**: Complex build configuration separate from clean runtime API.

## Why Just Name?

**Two pieces of info needed at runtime:**

1. **`name`**: To refresh specific widgets (`WidgetCenter.reloadTimelines(ofKind: name)`)
2. **`appGroup`**: To access shared storage (`UserDefaults(suiteName: appGroup)`)

**But** - `appGroup` is already in your `app.json`:

```json
{
  "ios": {
    "entitlements": {
      "com.apple.security.application-groups": ["group.com.example.app"]
    }
  }
}
```

So it's auto-detected via `expo-constants` at runtime! You only need to provide the unique `name`.
