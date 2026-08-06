# Native / Share

Thin expo-targets example host for `share` (native UI — no RN `entry`).

Suite how-to (install, Devicewright, icons): [../../README.md](../../README.md).

Type / maturity SSOT: [../../../docs/configuration.md](../../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/native/share
npx expo prebuild --platform ios
npx expo run:ios

# Android (deepen Activity under targets/native-share/android/...)
npx expo prebuild --platform android
npx expo run:android
```

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=native-share
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
