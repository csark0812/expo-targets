# Print Service

Thin expo-targets example host for `print-service`.

Suite how-to (install, Devicewright, icons): [../README.md](../README.md).

Type / maturity SSOT: [../../docs/configuration.md](../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/print-service
npx expo prebuild --platform ios
npx expo run:ios
```

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=print-service
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
