# Devicewright example suite (consumer)

**Source of truth for** Devicewright operator journeys for `examples/*`.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-06 -->

Owns REQUIRED_V2 journeys for public `examples/*`, plus the Android closed set `REQUIRED_ANDROID` (26 ids). Devicewright (`@csark0812/devicewright`) is the private npm library that runs them.

See [PR_PROOF.md](./PR_PROOF.md) for operator pre-merge checklist, [claims.ts](./claims.ts) for approved `os-limit` rows (including `platforms: ["android"]` drafts), [touchpoints.ts](./touchpoints.ts) / `ANDROID_LOCKED_P` for live-touchpoint definitions, and [required.ts](./required.ts) for `REQUIRED_ANDROID`.

## Full-demo green (notification-service Phase 1)

`green` for `notification-service` means the **user-visible lock-screen demo** completed and asserted **and** App Group corroboration — dual-AND on this run’s title nonce + `[expo-targets]`. App Group / pluginkit alone is never green. HTTP `200` from Devicewright `pushRemoteNotification` (`@csark0812/devicewright@^0.1.9`) is transport only, not delivery/NSE proof. Missing `APNS_*` AuthKey → `operator` (do not merge on operator — attach a local green matrix artifact).

Phase 2 (same suite): keyboard / live-activity / stickers / watch(+widget) also require visible OS demos; Sim ceilings exit `os-limit` + CLAIMS, not soft host/pluginkit greens.

## Layout

| Path | Role |
| ---- | ---- |
| `examples/share/.devicewright/journey.ts` | Per-example entry |
| `examples/.devicewright/` | Shared suite (claims, touchpoints, matrix CLI) |
| `examples:devicewright:share` | npm script → matrix `--ids=share` |

## Private dependency

```bash
export NODE_AUTH_TOKEN=…   # read access to private @csark0812/devicewright
bun install
```

See [AUTH.md](./AUTH.md).

## Release install (required for share/action/messages bars)

```bash
# iOS
cd examples/share
npx expo prebuild --platform ios
# operator: Release install on booted sim

# Android (share dual)
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
adb -s emulator-5554 install -r app/build/outputs/apk/release/app-release.apk
```

Live matrix:

```bash
# iOS
bun run examples:devicewright:share

# Android — host Share sheet required (chooser → Save → host marker)
bun run examples:devicewright:share:android
# Android — launcher widget tile must show seeded marker
bun run examples:devicewright:widgets:android
# Android — DocumentsUI lists Expo Targets root + host android-docs marker
bun run examples:devicewright:file-provider:android
# Android closed matrix (REQUIRED_ANDROID, live-through=5)
bun run examples:devicewright:android:matrix
# or:
bun examples/.devicewright/cli.ts matrix --ids=share --platform=android --device=emulator-5554 --live-through=1

# Human summary + live stderr progress (default). Machine JSON:
bun examples/.devicewright/cli.ts matrix --platform=android --device=emulator-5554 --live-through=5 --no-fail-fast --json
# Always written: artifactDir/events.jsonl + matrix-result.json (prefer these over redirecting stdout)
```

Android Master Locked P strings live in `ANDROID_LOCKED_P` ([touchpoints.ts](./touchpoints.ts)). Must-green / must-remain-green ids must exit `green` only; other closed-set ids may exit `green` ∪ Android `os-limit` with matching CLAIMS.

Debug binaries are an **operator** fail. For each REQUIRED_V2 example:

```bash
cd examples/share   # or action|messages|…
bun install
npx expo prebuild --platform ios
# --no-bundler is required: without it, run:ios installs then hangs forever on
# Metro + "Logs for your project will appear below" (Build Succeeded ≠ exit).
npx expo run:ios --configuration Release --device <UDID> --no-bundler
```

Do **not** pipe `expo run:ios` through `tail` (e.g. `| tee log | tail -40`) — `tail`
waits for EOF, so a Metro hang looks like “no output / stuck” in agent terminals.

`--ensure-install` already passes `--no-bundler`, but it **skips when the host is
already on the sim**. Stale binaries need an explicit rebuild (uninstall or re-run
the Release command above) — ensure-install alone will not refresh them.

### Opt-in ensure-install

Pass `--ensure-install` so the matrix Release-builds any missing host before its journey (skips when already on the sim). First full run can take a long time (minutes × up to 8 apps).

```bash
bun examples/.devicewright/cli.ts matrix --ids=share --ensure-install --no-fail-fast
bun run examples:devicewright:matrix:ensure   # live-through=3, all rows, --no-fail-fast
```

Without the flag, missing hosts stay an operator/infra fail (no builds).

### iOS 26.5+ accessibility

`@csark0812/devicewright@^0.1.3` sets `IgnoreAXServerEntitlements` in `doctor` / `devices.launch`. Empty `Application {0×0}` from idb usually means an older DW or a sim that needs a SpringBoard refresh — run dry-preflight / relaunch.

## dry-preflight + matrix

```bash
bun examples/.devicewright/cli.ts dry-preflight
bun examples/.devicewright/cli.ts matrix --stubs-only
bun examples/.devicewright/cli.ts matrix --live-through=1
```

Or root scripts: `bun run examples:devicewright:dry-preflight`, `examples:devicewright:matrix`, etc.

## Artifacts

Run output: `examples/.devicewright/artifacts/` (gitignored except committed spikes under `artifacts/spikes/`).
