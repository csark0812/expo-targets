# Notification Content

Thin expo-targets example host for `notification-content`.

Suite how-to (install, Devicewright, icons): [../README.md](../README.md).

Type / maturity SSOT: [../../docs/configuration.md](../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/notification-content
npx expo prebuild --platform ios
npx expo run:ios
# Android
npx expo prebuild --platform android
npx expo run:android
```

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=notification-content
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
