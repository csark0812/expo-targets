# Examples

Thin Expo SDK 54 hosts for exercising expo-targets. Each package is Maestro-ready with host-contract `testID`s.

> **Agent constraint:** Humans boot the iOS Simulator and run `expo run:ios` (or Maestro) locally. Do not treat Maestro YAML as CI-proven without a built `.app` on a simulator.

## Packages

| Package                            | NPM name                              | Target story                                                                       | Maestro                                           |
| ---------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| [`share`](./share)                 | `@expo-targets/example-share`         | React Native share extension                                                       | `smoke.yaml` (automated host)                     |
| [`action`](./action)               | `@expo-targets/example-action`        | React Native action extension                                                      | `smoke.yaml` (automated host)                     |
| [`messages`](./messages)           | `@expo-targets/example-messages`      | React Native messages extension                                                    | `smoke.yaml` (automated host)                     |
| [`clip`](./clip)                   | `@expo-targets/example-clip`          | React Native App Clip + `expotargets-clip` scheme                                  | `smoke.yaml` (host + `openLink`)                  |
| [`stickers`](./stickers)           | `@expo-targets/example-stickers`      | Asset-only sticker pack (no `withTargetsMetro`)                                    | `smoke.yaml` (automated host)                     |
| [`widgets`](./widgets)             | `@expo-targets/example-widgets`       | iOS WidgetKit only — **soft-deprecated** → [`docs/widgets.md`](../docs/widgets.md) | `smoke.yaml` (automated host)                     |
| [`kitchen-sink`](./kitchen-sink)   | `@expo-targets/example-kitchen-sink`  | Five targets, one App Group (messages, not stickers — iOS payload-provider limit)  | `smoke-{share,action,clip,widgets,messages}.yaml` |
| [`native/share`](./native/share)   | `@expo-targets/example-native-share`  | Swift share + RN host (`AppGroupStorage`)                                          | `smoke.yaml` (automated host)                     |
| [`native/action`](./native/action) | `@expo-targets/example-native-action` | Swift action + RN host                                                             | `smoke.yaml` (automated host)                     |
| [`native/clip`](./native/clip)     | `@expo-targets/example-native-clip`   | SwiftUI App Clip + RN host (`expotargets-native-clip`)                             | `smoke.yaml` (host + `openLink`)                  |

## App icons

Hosts share a target + extension-slot mark under [`_brand/`](./_brand) with per-package accent colors. Regenerate with `examples/_brand/render_icons.py` (see that folder’s README). Native AppIcon catalogs update on the next prebuild.

## Maestro prerequisites

1. [Maestro CLI](https://maestro.mobile.dev/) installed (`maestro --version`)
2. iOS Simulator booted with the example app installed (`cd examples/<pkg> && bun run ios`)
3. Optional: [Maestro MCP](https://maestro.mobile.dev/) via `.cursor/mcp.json` for agent-driven flows

Shared subflow: [`examples/.maestro/subflows/ios-open-security-dialog.yaml`](./.maestro/subflows/ios-open-security-dialog.yaml) — dismisses an “Open” security prompt when present.

## Automated vs manual matrix

| Flow                     | Automated (Maestro host smoke) | Manual (OS / extension UI)  |
| ------------------------ | ------------------------------ | --------------------------- |
| Host seed/clear payload  | Yes — all packages             | —                           |
| Share extension save     | —                              | Photos → Share sheet        |
| Action extension process | —                              | Photos → action sheet       |
| Messages extension send  | —                              | Messages → Apps             |
| App Clip checkout        | Partial — `openLink` only      | Full clip UI in clip target |
| Sticker pack             | —                              | Messages → Stickers drawer  |
| Widget on Home Screen    | —                              | Add widget, verify message  |
| Native Swift extensions  | —                              | Share/action/clip native UI |

## Widgets soft-deprecation

New React/iOS widgets and Live Activities should use official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/). The [`widgets`](./widgets) and kitchen-sink `ks-widgets` examples remain for WidgetKit spine testing only. See [`docs/widgets.md`](../docs/widgets.md) and [`docs/deprecations.md`](../docs/deprecations.md).

## Quick start

```bash
bun install
cd examples/share
bun run ios
maestro test .maestro/smoke.yaml
```

From the repo root:

```bash
bun run examples:maestro:share
```

Do not commit generated `ios/` or `android/` folders from example prebuilds.

## PR C — process proof (Release, local / MCP only)

Host Maestro (PR B) is **not** full runtime proof. PR C adds:

| Layer              | Packages                                           | Harness                                                                                                                                       |
| ------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| System Share Sheet | `share`, `action`, `native/share`, `native/action` | XCUITest under [`_harness/uitests/`](./_harness/uitests/)                                                                                     |
| Clip real launch   | `clip`, `native/clip`                              | Maestro [`clip/.maestro/launch.yaml`](./clip/.maestro/launch.yaml) / [`native/clip/.maestro/launch.yaml`](./native/clip/.maestro/launch.yaml) |

**Release builds required.** See [`_harness/uitests/README.md`](./_harness/uitests/README.md) for C1 attach-after-prebuild spike, C2 failure gates (re-grill, no silent downgrade), and path to later non-blocking macOS CI.

```bash
# Share Sheet (after prebuild + attach)
./examples/_harness/uitests/scripts/attach-after-prebuild.sh examples/share

# Clip launch
cd examples/clip && npx expo run:ios --configuration Release
maestro test .maestro/launch.yaml
```

### Post-C deferred spikes

Messages / stickers / widgets real-process automation remains separate best-effort spikes (OS-owned entry: Messages, Stickers drawer, Home Screen widgets).
