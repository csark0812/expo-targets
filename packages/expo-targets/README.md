# expo-targets

**Source of truth for** the published package overview (monorepo canonical story lives in the root README).

<!-- doc-meta: owner=eng | last-reviewed=2026-08-10 -->

Expo config plugin and runtime for Apple app extensions Expo does not ship. The library covers share, action, App Clips, messages, stickers, wallet, and more. React Native UIs work for share, action, clip, messages, notification-content, and safari (popup).

> **Part of the expo-targets monorepo**. Full docs: [https://github.com/csark0812/expo-targets](https://github.com/csark0812/expo-targets).
>
> **Tested on Expo SDK 57** (development builds; Expo Go is not supported).
>
> **Widgets:** Native WidgetKit and Live Activities are first-class on iOS. Android widgets are first-class (Glance and RemoteViews). See [widgets](https://github.com/csark0812/expo-targets/blob/main/docs/widgets.md). Do not use the `expo-widgets` config plugin and expo-targets `widget` targets in the same app.
>
> **Bare RN:** Run `npx expo-targets sync` against an existing `ios/` tree, then `pod install`. For new projects, use managed Expo and `npx expo prebuild`.

## Quick Start

```bash
npm install expo-targets
npx expo-targets add
# Share Extension → my-share → Use React Native: Yes
```

`expo-targets add` wires the host by default. Install dependencies if wiring added `expo-targets` to `package.json`.

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
- [API](https://github.com/csark0812/expo-targets/blob/main/docs/api.md) (includes [`ExtensionUpdates`](https://github.com/csark0812/expo-targets/blob/main/docs/api.md#extensionupdates))
- [React Native extensions](https://github.com/csark0812/expo-targets/blob/main/docs/react-native-extensions.md) — [App Group OTA / eas update](https://github.com/csark0812/expo-targets/blob/main/docs/react-native-extensions.md#extension-bundle-sideload-with-expo-updates)
- [Widgets](https://github.com/csark0812/expo-targets/blob/main/docs/widgets.md)
- [Contributing](https://github.com/csark0812/expo-targets/blob/main/CONTRIBUTING.md)

## License

MIT
