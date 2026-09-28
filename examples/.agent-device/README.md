# agent-device example suite (consumer)

**Source of truth for** agent-device operator journeys for `examples/*`.

<!-- doc-meta: owner=eng | last-reviewed=2026-09-27 -->

Owns REQUIRED_V2 journeys for public `examples/*`, plus the Android closed set `REQUIRED_ANDROID` (28 ids). The typed `agent-device` client drives every session.

## Migration capability gate

The reviewed fork release implements every load-bearing primitive through the public typed client. The capability ledger remains fail-closed: an unavailable command fails preflight or the row and never becomes `os-limit`, `operator`, or green.

| Public capability | Rows using it |
| --- | --- |
| launch environment for App Clip invocation | `clip`, `native-clip` |
| point description for opaque system-extension surfaces | `messages`, `share`, `action`, `stickers` |
| verified screen-lock transition | `notification-service`, `notification-content`, `live-activity` |
| Wear phone pairing and watchOS runtime | `watch`, `watch-widget` |

The authoritative mapping is [capabilities.ts](./capabilities.ts). A capability is accepted only after its negative contract tests and Release-matrix proof in [PR_PROOF.md](./PR_PROOF.md).

Fork commits, package integrity, the immutable public release asset, and upstream PRs are recorded in [fork-provenance.json](./fork-provenance.json). The dependency is pinned to that exact release tarball until Callstack ships equivalent capabilities.

See [PR_PROOF.md](./PR_PROOF.md) for the operator pre-merge checklist, [claims.ts](./claims.ts) for approved `os-limit` rows (including `platforms: ["android"]` drafts), [touchpoints.ts](./touchpoints.ts) / `ANDROID_LOCKED_P` for live-touchpoint definitions, and [required.ts](./required.ts) for `REQUIRED_ANDROID`.

## Full-demo green (notification-service Phase 1)

`green` for `notification-service` means the **user-visible lock-screen demo** completed and asserted **and** App Group corroboration — dual-AND on this run’s title nonce + `[expo-targets]`. App Group / pluginkit alone is never green. HTTP `200` from agent-device `pushRemoteNotification` is transport only, not delivery / NSE proof. Missing `APNS_*` AuthKey → `operator` (do not merge on operator — attach a local green matrix artifact).

Phase 2 (same suite): keyboard / live-activity / stickers / watch(+widget) also require visible OS demos. Sim ceilings exit `os-limit` + CLAIMS, not soft host / pluginkit greens.

## Layout

| Path | Role |
| ---- | ---- |
| `examples/share/.agent-device/journey.ts` | Per-example entry |
| `examples/.agent-device/` | Shared suite (claims, touchpoints, matrix CLI) |
| `examples:agent-device:share` | npm script → matrix `--ids=share` |

## Dependency

```bash
bun install
```

The fork package is a public GitHub release asset and requires no repository npm token or private registry configuration.

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
bun run examples:agent-device:share

# Android — host Share sheet required (chooser → Save → host marker)
bun run examples:agent-device:share:android
# Android — launcher widget tile must show seeded marker
bun run examples:agent-device:widgets:android
# Android — DocumentsUI lists Expo Targets root + host android-docs marker
bun run examples:agent-device:file-provider:android
# Android closed matrix (REQUIRED_ANDROID, live-through=5)
bun run examples:agent-device:android:matrix
# iOS closed matrix (REQUIRED_V2, live-through=5)
bun run examples:agent-device:ios:matrix -- --device=<udid> --release-manifest=/absolute/path/ios-release-builds.json
# or:
bun examples/.agent-device/cli.ts matrix --ids=share --platform=android --device=emulator-5554 --live-through=1

# Human summary + live stderr progress (default). Machine JSON:
bun examples/.agent-device/cli.ts matrix --platform=android --device=emulator-5554 --live-through=5 --no-fail-fast --json
# Always written: artifactDir/events.jsonl + matrix-result.json (prefer these over redirecting stdout)
```

Android Master Locked P strings live in `ANDROID_LOCKED_P` ([touchpoints.ts](./touchpoints.ts)). Must-green / must-remain-green ids must exit `green` only. Other closed-set ids can exit `green` ∪ Android `os-limit` with matching CLAIMS.

Debug binaries are an **operator** fail. For each REQUIRED_V2 example:

```bash
cd examples/share   # or action|messages|…
bun install
npx expo prebuild --platform ios
# --no-bundler is required: without it, run:ios installs then hangs forever on
# Metro + "Logs for your project will appear below" (Build Succeeded ≠ exit).
npx expo run:ios --configuration Release --device <UDID> --no-bundler
```

Do **not** pipe `expo run:ios` through `tail` (for example `| tee log | tail -40`). `tail` waits for EOF, so a Metro hang looks like “no output / stuck” in agent terminals.

`--ensure-install` already passes `--no-bundler`, but it **skips when the host is already on the sim**. Stale binaries need an explicit rebuild (uninstall or re-run the Release command above). ensure-install alone will not refresh them.

### Opt-in ensure-install

Pass `--ensure-install` so the matrix Release-builds any missing host before its journey (skips when already on the sim). The first full run can take a long time (minutes × up to 8 apps).

```bash
bun examples/.agent-device/cli.ts matrix --ids=share --ensure-install --no-fail-fast
bun run examples:agent-device:matrix:ensure   # live-through=3, all rows, --no-fail-fast
```

Without the flag, missing hosts stay an operator / infra fail (no builds).

### iOS 26.5+ accessibility

Pinned agent-device owns the XCTest runner used by `doctor` and live sessions. A sparse accessibility snapshot is a failed proof unless the journey captures a screenshot and uses its documented coordinate fallback.

## dry-preflight + matrix

```bash
bun examples/.agent-device/cli.ts dry-preflight
bun examples/.agent-device/cli.ts matrix --stubs-only
bun examples/.agent-device/cli.ts matrix --live-through=1
```

Or root scripts: `bun run examples:agent-device:dry-preflight`, `examples:agent-device:matrix`, and related scripts.

## Artifacts

Run output: `examples/.agent-device/artifacts/` (gitignored except committed spikes under `artifacts/spikes/`).

Each completed matrix writes a runner manifest that binds its Git SHA, exact agent-device version,
fork/upstream provenance, platform, device, OS/API version, and timestamps to the evidence directory.
Pass `--release-manifest=<path>` for live acceptance runs to bind the exact Release binary digests.
Both capture and acceptance require a clean working tree so `gitSha` identifies the tested source.
The manifest format and two-pair cutover gate are documented in [`PR_PROOF.md`](./PR_PROOF.md).
A live run without that inventory remains useful diagnosis, but cannot satisfy cutover acceptance.
