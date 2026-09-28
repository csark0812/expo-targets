# Network Filter Data

Thin expo-targets example host for `network-filter-data`.

Suite how-to (install, agent-device, icons): [../README.md](../README.md).

Type / maturity SSOT: [../../docs/configuration.md](../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/network-filter-data
npx expo prebuild --platform ios
npx expo run:ios
```

agent-device (operator, after Release install on a booted sim):

```bash
bun run examples:agent-device:matrix --ids=network-filter-data
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
