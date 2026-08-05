# Migrate from `@bacons/apple-targets`

Field-map notes for moving a project onto expo-targets (`TargetConfig` / `createTarget` style). Not part of the docs SSOT — prefer [configuration.md](./configuration.md) for current APIs.

This is a **field-map migration**, not a silent plugin swap. There is no `ConfigFunction` adapter or import shim from the previous package.

## Quick steps (typical share / clip / widget project)

1. Replace the config plugin `@bacons/apple-targets` with `expo-targets` in `app.json` / `app.config`.
2. Keep `/targets/<name>/expo-target.config.*` — rename fields per the table below (`exportJs` → `entry` + Metro).
3. Swap storage: Bacon `ExtensionStorage` → `createTarget` / App Group helpers from `expo-targets`.
4. Widgets / Live Activities: native WidgetKit + ActivityKit in expo-targets ([widgets.md](./widgets.md)); do not dual-generate with `expo-widgets`.
5. Alias: Bacon `imessage` → expo-targets `stickers` (asset pack) or `messages` (Messages app). Payload-provider stickers are not a full Messages extension.

## Plugin / package rename

| Bacon                                        | expo-targets                                        |
| -------------------------------------------- | --------------------------------------------------- |
| `@bacons/apple-targets` plugin               | `expo-targets`                                      |
| `@bacons/apple-targets` / `ExtensionStorage` | `createTarget`, App Group storage APIs              |
| `npx create-target`                          | `npx create-expo-target`                            |
| Metro / `exportJs` wiring                    | `entry` + `expo-targets/metro` (`withTargetsMetro`) |

## Type alias table

| Bacon `type`                    | expo-targets `type`                           | Notes                                          |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| `widget`                        | `widget`                                      | First-class native WidgetKit + Live Activities |
| `watch-widget`                  | `watch-widget`                                | Paired watch DoD                               |
| `imessage`                      | `stickers` or `messages`                      | No `imessage` in ExtensionType                 |
| `share` / `action` / `clip` / … | same string when listed in ExtensionType      | See [configuration.md](./configuration.md)     |
| Other legacy type names         | Map to the closest ExtensionType + example    | See [configuration.md](./configuration.md)     |

## Config field map

| Bacon                                            | expo-targets                                           |
| ------------------------------------------------ | ------------------------------------------------------ |
| `exportJs: true` / JS entry convention           | `entry: "./targets/<name>/index.tsx"` (+ Metro helper) |
| Top-level entitlements / frameworks on config fn | `ios.entitlements`, `ios.frameworks` on `TargetConfig` |
| `ExtensionStorage`                               | `createTarget(...).setData` / `.storage` (App Groups)              |
| Companion UI flags (wallet / intent)             | `ios.wallet.ui`, `ios.intents.ui`                                  |
| Color / icon assets                              | `ios.colors`, `ios.images`, `ios.targetIcon`                       |

## Sealed path (post-0.2.8)

CNG write sealed artifacts under `ios/<App>/ExpoTargetsGenerated/<Product>/` (gitignored). User deepen stays in `targets/<name>/ios/`. If you migrated from Bacon while following older expo-targets docs that pointed at a different generated tree, move hand-edits into `targets/*/ios/` and re-run `npx expo prebuild`. Never edit `ExpoTargetsGenerated/`.

## Pods

See existing note in `packages/expo-targets/plugin/src/ios/observe/podsRb.ts` — keep Expo pods wiring; review any copied Podfile helpers carefully.

## Related

- [configuration.md](./configuration.md)
- [deprecations.md](./deprecations.md)
- [react-native-extensions.md](./react-native-extensions.md)
- [widgets.md](./widgets.md)
