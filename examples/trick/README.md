# ET Trick

Showcase host for expo-targets capability expansion (Phases A–C of the Trick expansion plan).

| Appex                              | Type                                       |
| ---------------------------------- | ------------------------------------------ |
| ET Trick NSE                       | notification-service                       |
| ET Trick NCE                       | notification-content                       |
| ET Trick Photo                     | photo-editing                              |
| ET Trick Files                     | file-provider (+ host domain registration) |
| ET Trick Keyboard                  | keyboard                                   |
| ET Trick Safari                    | safari                                     |
| ET Trick Blocker                   | content-blocker                            |
| ET Trick Share / Action / Messages | share / action / messages                  |
| ET Trick Widget                    | widget + ActivityKit Live Activity         |

Shared app group: `group.com.expotargets.example.trick`.

## Host controls

| Button                    | What it does                                     |
| ------------------------- | ------------------------------------------------ |
| Schedule NCE notification | Local notification with `myNotificationCategory` |
| Register Files domain     | `NSFileProviderManager.add` → Files → Browse     |
| Start / End Live Activity | ActivityKit (Lock Screen / Dynamic Island)       |

Local Expo modules:

- `modules/trick-file-domain` — domain registration
- `modules/trick-live-activity` — ActivityKit start/end (attributes must match `trick-widgets`)

## Simulator notes

- **NSE:** Simulator often skips the notification-service process. Green floor prefers App Group `nse-last-title.txt` mutation; lock-screen title AX may stay empty. Physical device recommended for full NSE proof.
- **NCE:** Expand (long-press / pull-down) until `ET Trick NCE` marker shows; journeys fall back to category + pluginkit when Sim expand fails.
- **Photo Edit:** After Edit, probe Extensions / overflow; Sim rarely lists third-party editors — pluginkit is an acceptable floor.
- **Photos sample:** use Devicewright `addMedia` (or drag an image into the sim) before the photo-editing journey.
- **Live Activities:** require iOS 16.1+ and Settings → Live Activities enabled; Sim Dynamic Island support varies by device model.

## Build

```bash
cd examples/trick
bun install
npx expo prebuild --platform ios --clean
npx expo run:ios --configuration Release --device <UDID> --no-bundler
```

Limits / ownership: [docs/limits.md](../../docs/limits.md), [docs/widgets.md](../../docs/widgets.md).
