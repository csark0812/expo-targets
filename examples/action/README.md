# Action

React Native action extension example. The host shows the last action payload from App Group storage. On iOS, share an image into the action extension. On Android, share text via PROCESS_TEXT.

Suite how-to: [../README.md](../README.md). Getting started: [../../docs/getting-started.md](../../docs/getting-started.md). Type maturity: [../../docs/configuration.md](../../docs/configuration.md).

```bash
npm install
npx expo prebuild --platform ios
npx expo run:ios
# Android
npx expo prebuild --platform android
npx expo run:android
```

From the monorepo root, run `bun install` once before `npm install` in this folder.

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=action
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
