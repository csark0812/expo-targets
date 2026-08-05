# Examples

Thin Expo SDK 57 hosts for exercising expo-targets. Host contracts use `testID`s consumed by Devicewright journeys under [`examples/.devicewright/`](./.devicewright/).

> **Agent constraint:** Humans boot the iOS Simulator and run `expo run:ios` locally. Devicewright matrix greens are operator-proven (not CI-gated) — see [`.devicewright/PR_PROOF.md`](./.devicewright/PR_PROOF.md).

## Packages

| Package                            | NPM name                              | Target story                                                                      |
| ---------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------- |
| [`share`](./share)                 | `@expo-targets/example-share`         | React Native share extension                                                      |
| [`action`](./action)               | `@expo-targets/example-action`        | React Native action extension                                                     |
| [`messages`](./messages)           | `@expo-targets/example-messages`      | React Native messages extension                                                   |
| [`clip`](./clip)                   | `@expo-targets/example-clip`          | React Native App Clip + `expotargets-clip` scheme                                 |
| [`stickers`](./stickers)           | `@expo-targets/example-stickers`      | Asset-only sticker pack (no `withTargetsMetro`)                                   |
| [`widgets`](./widgets)             | `@expo-targets/example-widgets`       | iOS WidgetKit + ActivityKit spine — [`docs/widgets.md`](../docs/widgets.md)       |
| [`kitchen-sink`](./kitchen-sink)   | `@expo-targets/example-kitchen-sink`  | Five targets, one App Group (messages, not stickers — iOS payload-provider limit) |
| [`native/share`](./native/share)   | `@expo-targets/example-native-share`  | Swift share + RN host (`AppGroupStorage`)                                         |
| [`native/action`](./native/action) | `@expo-targets/example-native-action` | Swift action + RN host                                                            |
| [`native/clip`](./native/clip)     | `@expo-targets/example-native-clip`   | SwiftUI App Clip + RN host (`expotargets-native-clip`)                            |

Bacon-parity and other stub hosts live alongside these; REQUIRED journeys are listed in [`.devicewright/`](./.devicewright/).

## App icons

Hosts share a target + extension-slot mark under [`_brand/`](./_brand) with per-package accent colors. Regenerate with `examples/_brand/render_icons.py` (see that folder’s README). Native AppIcon catalogs update on the next prebuild.

## Devicewright

See [`.devicewright/README.md`](./.devicewright/README.md) for auth, Release install, and matrix commands.

```bash
bun run examples:devicewright:share
# or full operator matrix:
bun run examples:devicewright:matrix:ensure
```

## Widgets + Live Activities

Native WidgetKit and ActivityKit are first-class in expo-targets. See [`widgets`](./widgets), [`trick`](./trick) (Live Activity showcase), [`docs/widgets.md`](../docs/widgets.md), and [`docs/limits.md`](../docs/limits.md). Android widgets stay bridge-grade (Glance/RemoteViews) until Expo covers them.

## Quick start

```bash
bun install
cd examples/share
bun run ios
```

From the repo root (after a Release install on a booted sim):

```bash
bun run examples:devicewright:share
```

Do not commit generated `ios/` or `android/` folders from example prebuilds.
