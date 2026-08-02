# Capability limits

**Source of truth for** lib floor vs Apple/account gates for extension types.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-02 -->

## Config-only vs stubs

| Kind                                   | Meaning                                                                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Asset-only (`requiresCode: false`)** | Only [`stickers`](../packages/expo-targets/plugin/src/domain/characteristics.ts) — system principal, no custom Swift required.                                                                         |
| **Scaffold + stub**                    | Plugin generates the Xcode target; older examples used `NSObject` placeholders. Prefer minimal real Apple subclasses (this repo’s direction).                                                          |
| **Policy freeze**                      | Do **not** add new `ExtensionType` values that only emit an empty Xcode target. Same PR must ship registry + scaffold + example + Devicewright REQUIRED row. See [deprecations.md](./deprecations.md). |

## Lib floor vs hard stop

| Family                                                                            | Lib floor (shippable here)                                         | Hard stop                                          |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| Share / action / messages / clip / stickers / safari / content-blocker / keyboard | Deep Devicewright greens on Simulator                              | —                                                  |
| Notification service / content                                                    | Real principals; category push; App Group mutation marker          | Simulator often skips NSE process                  |
| Photo editing                                                                     | Real `PHContentEditingController`; Photos Edit + pluginkit         | Sim rarely lists third-party editors               |
| File Provider                                                                     | Real `NSFileProviderExtension` + host `NSFileProviderManager.add`  | Full sync / File Provider UI depth                 |
| Widgets + Live Activities                                                         | Native WidgetKit + ActivityKit (owned here)                        | Dual-engine with `expo-widgets` unsupported        |
| Wallet                                                                            | Real PassKit issuer handler                                        | `payment-pass-provisioning` Apple allow-list       |
| Network Extensions                                                                | Real `NE*Provider` subclasses that fail closed without entitlement | Network Extension entitlement / VPN Personal / MDM |
| Credentials / SSO / Call Directory / Family Controls / location-push              | Minimal real principals + host contract                            | Entitlement and/or Settings-only enablement        |
| Watch / watch-widget                                                              | Scaffold                                                           | Paired watchOS simulator or device                 |
| Android                                                                           | Widget bridge (Glance / RemoteViews) only                          | No Apple-extension parity on Android               |

Frozen Devicewright `os-limit` allowlist: [`examples/.devicewright/claims.ts`](../examples/.devicewright/claims.ts).

## Showcase

[`examples/trick`](../examples/trick) packs deepened targets + File Provider domain registration + Live Activity host controls.
