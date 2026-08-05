# Bg Download

Thin expo-targets example host for `bg-download`.

Suite how-to (install, Devicewright, icons): [../README.md](../README.md).

Type / maturity SSOT: [../../docs/configuration.md](../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/bg-download
npx expo prebuild --platform ios
npx expo run:ios
```

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=bg-download
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
