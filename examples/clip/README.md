# Clip

React Native App Clip example. The host shows clip payload fields (item name, price) from App Group storage. Devicewright can launch the clip bundle id for invocation proof.

Suite how-to: [../README.md](../README.md). Getting started: [../../docs/getting-started.md](../../docs/getting-started.md). Type maturity: [../../docs/configuration.md](../../docs/configuration.md).

```bash
npm install
npx expo prebuild --platform ios
npx expo run:ios
```

From the monorepo root, run `bun install` once before `npm install` in this folder.

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=clip
```

Do not commit generated `ios/`. Never edit `ExpoTargetsGenerated/`.
