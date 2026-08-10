# Messages

React Native messages extension example. The host shows the last messages payload from App Group storage. Open the Messages app and pick the extension from the Apps drawer.

Suite how-to: [../README.md](../README.md). Getting started: [../../docs/getting-started.md](../../docs/getting-started.md). Type maturity: [../../docs/configuration.md](../../docs/configuration.md).

```bash
npm install
npx expo prebuild --platform ios
npx expo run:ios
```

From the monorepo root, run `bun install` once before `npm install` in this folder.

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=messages
```

Do not commit generated `ios/`. Never edit `ExpoTargetsGenerated/`.
