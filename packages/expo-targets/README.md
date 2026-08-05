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
> **Bare RN:** use `npx expo-targets sync` against an existing `ios/` tree, then `pod install`. Prefer managed Expo + `npx expo prebuild` for new projects.

## Quick Start

```bash
npm install expo-targets
npx create-expo-target
# Share Extension → my-share → Use React Native: Yes
```

`create-expo-target` wires the host by default. Install dependencies if wiring added `expo-targets` to `package.json`.

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withTargets } = require("expo-targets/metro");
module.exports = withTargets(getDefaultConfig(__dirname));
```

```typescript
// targets/my-share/index.tsx
import { createTarget } from "expo-targets";
import ShareExtension from "./ShareExtension";

export const myShare = createTarget("MyShare", ShareExtension);
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
