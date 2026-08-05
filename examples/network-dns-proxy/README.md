# Network Dns Proxy

Thin expo-targets example host for `network-dns-proxy`.

Suite how-to (install, Devicewright, icons): [../README.md](../README.md).

Type / maturity SSOT: [../../docs/configuration.md](../../docs/configuration.md).

```bash
# From repo root
bun install
cd examples/network-dns-proxy
npx expo prebuild --platform ios
npx expo run:ios
```

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=network-dns-proxy
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
