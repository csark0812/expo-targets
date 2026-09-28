# File Provider Ui

Thin expo-targets example host for `file-provider-ui`.

Suite how-to (install, agent-device, icons): [../README.md](../README.md).

Type / maturity SSOT: [../../docs/configuration.md](../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/file-provider-ui
npx expo prebuild --platform ios
npx expo run:ios
# Android
npx expo prebuild --platform android
npx expo run:android
```

agent-device (operator, after Release install on a booted sim):

```bash
bun run examples:agent-device:matrix --ids=file-provider-ui
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
