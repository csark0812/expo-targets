# Smart Card

Thin expo-targets example host for `smart-card`.

Suite how-to (install, Devicewright, icons): [../README.md](../README.md).

Type / maturity SSOT: [../../docs/configuration.md](../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/smart-card
npx expo prebuild --platform ios
npx expo run:ios
```

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=smart-card
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
