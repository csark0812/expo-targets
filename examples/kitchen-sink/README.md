# Kitchen Sink

Thin expo-targets example host for `multi-type (see host config)`.

Suite how-to (install, Devicewright, icons): [../README.md](../README.md).

Type / maturity SSOT: [../../docs/configuration.md](../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/kitchen-sink
npx expo prebuild --platform ios
npx expo run:ios
```

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=kitchen-sink
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
