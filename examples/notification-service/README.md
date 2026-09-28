# Notification Service

Thin expo-targets example host for `notification-service`.

Suite how-to (install, agent-device, icons): [../README.md](../README.md).

Type / maturity SSOT: [../../docs/configuration.md](../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/notification-service
npx expo prebuild --platform ios
npx expo run:ios
# Android
npx expo prebuild --platform android
npx expo run:android
```

agent-device (operator, after Release install on a booted sim):

```bash
bun run examples:agent-device:matrix --ids=notification-service
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
