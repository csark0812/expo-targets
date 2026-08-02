# expo-targets

**Source of truth for** the published package overview (monorepo canonical story lives in the root README).

<!-- doc-meta: owner=eng | last-reviewed=2026-08-02 -->

Expo config plugin and runtime for Apple app extensions Expo does not ship — share, action, App Clips, messages, stickers, wallet, and more. React Native UIs are supported for share/action/clip/messages.

> **Part of the expo-targets monorepo**. Full docs: [root README](../../README.md).
>
> **Widgets:** Native WidgetKit + Live Activities are first-class. See [widgets](../../docs/widgets.md). Android widgets are bridge-grade.

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

App Group storage, WidgetCenter reload, extension host bridges.

## Documentation

- [Getting started](../../docs/getting-started.md)
- [React Native extensions](../../docs/react-native-extensions.md)
- [Widgets / Live Activities](../../docs/widgets.md)
- [Deprecations](../../docs/deprecations.md)
- [Configuration](../../docs/configuration.md)
- [API](../../docs/api.md)

## License

MIT

## Credits

Inspired by [@bacons/apple-targets](https://github.com/EvanBacon/expo-apple-targets) and [expo-share-extension](https://github.com/MaxAst/expo-share-extension). Native WidgetKit + Live Activities are first-class here ([docs/widgets.md](../../docs/widgets.md)); official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) is an alternate React/Expo-UI path — do not dual-generate.
