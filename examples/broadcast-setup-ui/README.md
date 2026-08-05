# Broadcast Setup Ui

Thin expo-targets example host for `broadcast-setup-ui`.

Suite how-to (install, Devicewright, icons): [../README.md](../README.md).

Type / maturity SSOT: [../../docs/configuration.md](../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/broadcast-setup-ui
npx expo prebuild --platform ios
npx expo run:ios
```

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=broadcast-setup-ui
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
