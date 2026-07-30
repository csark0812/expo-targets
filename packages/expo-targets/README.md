# expo-targets

**Source of truth for** the published package overview (monorepo canonical story lives in the root README).

<!-- doc-meta: owner=eng | last-reviewed=2026-07-30 -->

Expo config plugin and runtime for Apple app extensions Expo does not ship — share, action, App Clips, messages, stickers, wallet, and more. React Native UIs are supported for share/action/clip/messages.

> **Part of the expo-targets monorepo**. Full docs: [root README](../../README.md).
>
> **Widgets:** Prefer official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) for React/iOS widgets and Live Activities. See [widgets handoff](../../docs/widgets.md).

## Quick Start

```bash
bun add expo-targets
```

```bash
npx create-expo-target
# Share Extension → my-share → Use React Native: Yes
```

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withTargetsMetro } = require("expo-targets/metro");
module.exports = withTargetsMetro(getDefaultConfig(__dirname));
```

```typescript
// targets/my-share/index.tsx
import { createTarget } from "expo-targets";
import ShareExtension from "./ShareExtension";

export const myShare = createTarget<"share">("MyShare", ShareExtension);
```

## Package Structure

### 1. TypeScript API (`src/`)

```typescript
import {
  createTarget,
  refreshAllTargets,
  close,
  openHostApp,
  getSharedData,
} from "expo-targets";
```

- `createTarget(name, component?)` — target instance; pass a component for RN extensions
- `close` / `openHostApp` / `getSharedData` — share/action (and related) lifecycle
- Storage helpers via the target instance (`setData`, `getData`, `refresh`)

### 2. Config Plugin (`plugin/`)

```json
{
  "expo": {
    "plugins": ["expo-targets"]
  }
}
```

### 3. Metro helper (`metro/`)

```js
const { withTargetsMetro } = require("expo-targets/metro");
module.exports = withTargetsMetro(getDefaultConfig(__dirname));
```

### 4. Native modules (`ios/`, `android/`)

App Group storage, WidgetCenter reload (legacy widgets), extension host bridges.

## Documentation

- [Getting started](../../docs/getting-started.md)
- [React Native extensions](../../docs/react-native-extensions.md)
- [Widgets handoff](../../docs/widgets.md)
- [Deprecations](../../docs/deprecations.md)
- [Configuration](../../docs/configuration.md)
- [API](../../docs/api.md)

## License

MIT

## Credits

Inspired by [@bacons/apple-targets](https://github.com/EvanBacon/expo-apple-targets) and [expo-share-extension](https://github.com/MaxAst/expo-share-extension). Official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) is the recommended path for React/iOS widgets; community [bittingz/expo-widgets](https://github.com/bittingz/expo-widgets) was historical inspiration only.
