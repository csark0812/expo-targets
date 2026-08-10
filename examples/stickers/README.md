# Stickers

Asset-only iMessage sticker pack example. The host shows the installed pack catalog (`Fun Stickers`). Sticker selection does not write to App Group storage.

Suite how-to: [../README.md](../README.md). Type maturity: [../../docs/configuration.md](../../docs/configuration.md).

```bash
npm install
npx expo prebuild --platform ios
npx expo run:ios
```

From the monorepo root, run `bun install` once before `npm install` in this folder.

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=stickers
```

Do not commit generated `ios/`. Never edit `ExpoTargetsGenerated/`.
