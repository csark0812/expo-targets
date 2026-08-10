# Share

React Native share extension example. The host reads the last saved share payload from App Group storage. Buttons seed, clear, refresh, and open the system share sheet (text or image).

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
bun run examples:devicewright:matrix --ids=share
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
