# Shield Action

Thin expo-targets example host for `shield-action`.

Suite how-to (install, Devicewright, icons): [../README.md](../README.md).

Type / maturity SSOT: [../../docs/configuration.md](../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/shield-action
npx expo prebuild --platform ios
npx expo run:ios
```

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=shield-action
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
