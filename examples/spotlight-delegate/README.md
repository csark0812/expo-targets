# Spotlight Delegate

Thin expo-targets example host for `spotlight-delegate`.

Suite how-to (install, agent-device, icons): [../README.md](../README.md).

Type / maturity SSOT: [../../docs/configuration.md](../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/spotlight-delegate
npx expo prebuild --platform ios
npx expo run:ios
```

agent-device (operator, after Release install on a booted sim):

```bash
bun run examples:agent-device:matrix --ids=spotlight-delegate
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
