# Examples

Thin Expo SDK 54 hosts for exercising expo-targets. Packages land in the follow-up `feat/examples-maestro-suite` PR.

## Planned packages

| Package | Target story |
| --- | --- |
| [`share`](./share) | React Native share extension |
| [`action`](./action) | React Native action extension |
| [`clip`](./clip) | React Native App Clip |
| [`stickers`](./stickers) | Asset-only sticker pack |
| [`widgets`](./widgets) | iOS WidgetKit only (soft-deprecated path → [`docs/widgets.md`](../docs/widgets.md)) |
| [`messages`](./messages) | React Native messages extension |
| [`kitchen-sink`](./kitchen-sink) | Six primary types in one host |
| [`native/share`](./native/share) | Swift share target + RN host |
| [`native/action`](./native/action) | Swift action target + RN host |
| [`native/clip`](./native/clip) | SwiftUI App Clip + RN host |

Host-contract Maestro YAML and runbooks ship with those packages. Do not treat this empty tree as runtime-proven until that PR lands.

After cloning locally, remove any leftover multi-GB `apps/` folders from older checkouts (`rm -rf apps`).
