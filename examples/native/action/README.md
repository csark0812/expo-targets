# Native / Action

Thin expo-targets example host for `action` (native UI — no RN `entry`).

Suite how-to (install, Devicewright, icons): [../../README.md](../../README.md).

Type / maturity SSOT: [../../../docs/configuration.md](../../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/native/action
npx expo prebuild --platform ios
npx expo run:ios

# Android (deepen Activity under targets/native-action/android/...)
npx expo prebuild --platform android
npx expo run:android
```

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=native-action
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
