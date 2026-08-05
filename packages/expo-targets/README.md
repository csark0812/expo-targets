# expo-targets

**Source of truth for** the published package overview (monorepo canonical story lives in the root README).

<!-- doc-meta: owner=eng | last-reviewed=2026-08-05 -->

Expo config plugin and runtime for Apple app extensions Expo does not ship — share, action, App Clips, messages, stickers, wallet, and more. React Native UIs are supported for share/action/clip/messages/notification-content/safari (popup).

> **Part of the expo-targets monorepo**. Full docs: [https://github.com/csark0812/expo-targets](https://github.com/csark0812/expo-targets).
>
> **Tested on Expo SDK 57** (development builds; not Expo Go).
>
> **Widgets:** Native WidgetKit + Live Activities are first-class. See [widgets](https://github.com/csark0812/expo-targets/blob/main/docs/widgets.md). Android widgets are bridge-grade.
>
> **Bare RN:** `expo-targets sync` is unimplemented — use `npx expo prebuild`. Tracking: [#67](https://github.com/csark0812/expo-targets/issues/67).

## Quick Start

```bash
npm install expo-targets
# or: bun add expo-targets / yarn add expo-targets
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

## Storage

```typescript
const target = createTarget("MyWidget");
target.setData({ key: "value" });
target.storage.set("key", "value");
target.refresh();
```

## Documentation

- [Getting started](https://github.com/csark0812/expo-targets/blob/main/docs/getting-started.md)
- [Configuration](https://github.com/csark0812/expo-targets/blob/main/docs/configuration.md)
- [API](https://github.com/csark0812/expo-targets/blob/main/docs/api.md)
- [Widgets](https://github.com/csark0812/expo-targets/blob/main/docs/widgets.md)
- [Contributing](https://github.com/csark0812/expo-targets/blob/main/CONTRIBUTING.md)

## License

MIT
