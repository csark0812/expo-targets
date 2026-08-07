# Capability limits

**Source of truth for** lib floor vs Apple/account gates for extension types.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-06 -->

## Max Sim-greenable policy

Devicewright deep greens prove the **Sim-greenable** subset (**P**): behavior that is AX- and/or journey-assertable on a stated iOS Simulator + pinned `@csark0812/devicewright@0.1.14` (root `package.json` / workspace dep). Not device-only chrome, not entitlement-gated Settings flows.

- Phase ids must `green` on **P**. Expanding Notification Content → custom UI is **never** an `os-limit` leftover.
- Public Apple APIs that cannot be proven on Simulator are documented leftovers (no dead product).
- Operator matrix under Release/`ensure-install` is the ship gate; CI does not gate Devicewright ([PR_PROOF.md](../examples/.devicewright/PR_PROOF.md)).

### S3a spike gate

Before documenting “not Sim-greenable,” attach a spike under `examples/.devicewright/artifacts/spikes/<id>-<feature>-<timestamp>.md` (steps tried, AX/labels sample, duration, id(s)). Owner = PR author. Journey-greenable ≠ automatic leftover.

### Leftover register

Each open leftover:

| Field | Meaning |
| ----- | ------- |
| `id` | REQUIRED matrix id |
| `feature` | Surface that could not green |
| `home` | `limits.md` \| later PR \| `wont-do` |
| `spike` | Path under `artifacts/spikes/` |
| `owner` | PR author |

**D1 done** when this policy + register section exist and every open leftover for the shipping PR has a row. **D1-scaffold** (stubs only) ≠ D1 done.

| id | feature | home | spike | owner |
| -- | ------- | ---- | ----- | ----- |
| live-activity | Dynamic Island / ActivityKit push / StandBy | limits.md (CLAIMS) | — | eng |
| live-activity | Watch chrome when pair boots without AX | CLAIMS after S3a | TBD on operator miss | eng |
| message-filter | Messages Unknown Senders / Text Message Filter list / inbound SMS invoke | CLAIMS | [spikes/message-filter-ql-spotlight-2026-08-04.md](../examples/.devicewright/artifacts/spikes/message-filter-ql-spotlight-2026-08-04.md) | eng |
| spotlight | CSImportExtension indexer → App Group / Spotlight hit | CLAIMS | [spikes/message-filter-ql-spotlight-2026-08-04.md](../examples/.devicewright/artifacts/spikes/message-filter-ql-spotlight-2026-08-04.md) | eng |
| call-directory | Phone → Call Blocking & Identification lists ET CallDir Target | CLAIMS | [spikes/unwanted-communication-call-directory-2026-08-04.md](../examples/.devicewright/artifacts/spikes/unwanted-communication-call-directory-2026-08-04.md) | eng |
| unwanted-communication | Phone → SMS/Call Reporting lists ET Unwanted Target | CLAIMS | [spikes/unwanted-communication-call-directory-2026-08-04.md](../examples/.devicewright/artifacts/spikes/unwanted-communication-call-directory-2026-08-04.md) | eng |
| file-provider | Files domain open → seed *file* visible in AX | CLAIMS | [spikes/file-provider-app-intent-2026-08-04.md](../examples/.devicewright/artifacts/spikes/file-provider-app-intent-2026-08-04.md) | eng |
| app-intent | Shortcuts tap ET Greet → run + App Group `ai:*` | CLAIMS | [spikes/file-provider-app-intent-2026-08-04.md](../examples/.devicewright/artifacts/spikes/file-provider-app-intent-2026-08-04.md) | eng |

Entitlement/Settings items use `home: wont-do` or the hard-stop table below; **revisit** when DW/Sim coverage improves (plan edit + spike re-run).

### Currently-green expansion backlog

Deepen already-green ids before adding shallow types: share/action(+native); safari(+native)/content-blocker; widgets/keyboard/photo-editing/clip(+native)/stickers. **file-provider** deepens via open→App Group `fp:*` (seed *UI* still empty on Air). **app-intent** keeps Shortcuts list floor (Unable to run App Shortcut on Air — see spike). Exit per id = required **P** surfaces green; S3a rows only for proven non-P features.

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
| Notification service / content                                                    | Real principals; category push; expand → custom UI marker          | Simulator often skips NSE process                  |
| Photo editing                                                                     | Real `PHContentEditingController`; Photos Edit + pluginkit         | Sim rarely lists third-party editors               |
| File Provider                                                                     | Real `NSFileProviderReplicatedExtension` + host domain add; Files list + open→App Group | Seed *file* AX / full sync depth                   |
| Widgets + Live Activities                                                         | Native WidgetKit + ActivityKit (owned here); LA start+update+end   | Dual-engine with `expo-widgets` unsupported; DI/push/StandBy CLAIMS |
| Wallet                                                                            | Real PassKit issuer handler                                        | `payment-pass-provisioning` Apple allow-list       |
| Network Extensions                                                                | Real `NE*Provider` subclasses that fail closed without entitlement | Network Extension entitlement / VPN Personal / MDM |
| Credentials / SSO / Call Directory / Family Controls / location-push              | Minimal real principals + host contract                            | Entitlement and/or Settings-only enablement        |
| Watch / watch-widget                                                              | `watch` + `watch-widget`: watchOS SDK/family 4; widget nests under Watch `.app` PlugIns | Device-only Embed Watch Content; Smart Stack needs user-added complication |
| Android                                                                           | API-ceiling dual through W3 + **W4-in-1.0 partials** + **Wear strong**: widgets; share/action; notifications + LA ongoing-notif; DocumentsProvider; Autofill; IME; CallScreening; Print; VpnService; App Actions / Wallet / AppSearch / ACTION_EDIT / bg-download / message-filter / unwanted-communication; Wear companion + tiles | Apple-only types stay `—`; FCM leftover; Settings/Play leftovers: IME / Autofill / CallScreening / VPN / print (see `artifacts/leftovers/android-settings-system-services-2026-08-06.md`) |

Frozen Devicewright `os-limit` allowlist: [`examples/.devicewright/claims.ts`](../examples/.devicewright/claims.ts).

## Showcase

[`examples/trick`](../examples/trick) packs deepened targets + File Provider domain registration + Live Activity host controls (start / update / end).
