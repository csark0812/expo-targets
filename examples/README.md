# Examples

**Source of truth for** the example host suite (how to run, Devicewright, inventory).

<!-- doc-meta: owner=eng | last-reviewed=2026-08-10 -->

Thin Expo SDK 57 hosts for exercising expo-targets. Per-host `README.md` files describe each showcase. Host contracts use `testID`s consumed by Devicewright journeys under [`examples/.devicewright/`](./.devicewright/).

> **Agent constraint:** Humans boot the iOS Simulator and run `expo run:ios` locally. Devicewright matrix greens are operator-proven (not CI-gated) — see [`.devicewright/PR_PROOF.md`](./.devicewright/PR_PROOF.md).

## Quick start

```bash
bun install   # needs NODE_AUTH_TOKEN for @csark0812/devicewright — see .devicewright/AUTH.md
cd examples/share
npx expo prebuild --platform ios
npx expo run:ios
```

From the repo root (after a Release install on a booted sim):

```bash
bun run examples:devicewright:share
# or full operator matrix:
bun run examples:devicewright:matrix:ensure
```

Do not commit generated `ios/` or `android/` folders from example prebuilds. Never edit `ExpoTargetsGenerated/`.

## Showcase hosts

| Package | Target story |
| --- | --- |
| [`share`](./share) | React Native share extension |
| [`extension-updates`](./extension-updates) | Share + `eas update` App Group OTA dogfood |
| [`action`](./action) | React Native action extension |
| [`messages`](./messages) | React Native messages extension |
| [`clip`](./clip) | React Native App Clip |
| [`stickers`](./stickers) | Asset-only sticker pack |
| [`widgets`](./widgets) | WidgetKit + Glance/RemoteViews (incl. `android.providers[]`) — [widgets.md](../docs/widgets.md) |
| [`trick`](./trick) | Live Activity showcase (`live-activity` Devicewright id) |
| [`kitchen-sink`](./kitchen-sink) | Multi-target host (optional aggregate) |
| [`native/share`](./native/share) | Swift share + RN host |
| [`native/action`](./native/action) | Swift action + RN host |
| [`native/clip`](./native/clip) | SwiftUI App Clip + RN host |

## Full inventory

Every REQUIRED_V2 path in [`.devicewright/required.ts`](./.devicewright/required.ts) (plus optional `kitchen-sink`) has a thin stub README. Types and maturity: [configuration.md](../docs/configuration.md).

Regenerate stubs after adding a REQUIRED row:

```bash
bun scripts/write-example-readme-stubs.ts
```

## App icons

Hosts share a target + extension-slot mark under [`_brand/`](./_brand). Regenerate with `examples/_brand/render_icons.py`.

## Devicewright

Operator deep-dive: [`.devicewright/README.md`](./.devicewright/README.md). Auth: [`.devicewright/AUTH.md`](./.devicewright/AUTH.md).

## Widgets + Live Activities

See [`widgets`](./widgets), [`trick`](./trick), [docs/widgets.md](../docs/widgets.md), and [docs/limits.md](../docs/limits.md). Android widgets are first-class (Glance and RemoteViews).
