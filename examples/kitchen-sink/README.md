# Kitchen Sink

Multi-target example host. One screen seeds and clears payloads for share, action, clip, widgets, and messages targets. Stickers are omitted (iOS allows only one message-payload-provider per app).

Suite how-to: [../README.md](../README.md). Getting started: [../../docs/getting-started.md](../../docs/getting-started.md). Type maturity: [../../docs/configuration.md](../../docs/configuration.md).

```bash
npm install
npx expo prebuild --platform ios
npx expo run:ios
```

From the monorepo root, run `bun install` once before `npm install` in this folder.

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=kitchen-sink
```

Do not commit generated `ios/`. Never edit `ExpoTargetsGenerated/`.
