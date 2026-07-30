# UITest harness (PR C)

**Local / MCP only.** Not a Ubuntu CI merge gate. **Release** simulator builds required for Share Sheet / real extension process.

## Failure gates (no silent downgrade)

| Spike | Gate | On failure |
| --- | --- | --- |
| **C1** XCUITest attach-after-prebuild | UI tests survive `npx expo prebuild --platform ios` regenerate and still drive Share Sheet for share/action | **Stop and re-grill** before merging PR C. Do not fall back to in-process-only, Maestro-Share-Sheet, or clip-only. |
| **C2** Maestro clip real launch | `openLink` / `simctl openurl` / `_XCAppClipURL` launches clip and host shows handoff | **Stop and re-grill** before merging PR C. |

## Coverage target (after C1 spike green)

| Package | Harness |
| --- | --- |
| `examples/share` | XCUITest Share Sheet |
| `examples/action` | XCUITest Share Sheet |
| `examples/native/share` | XCUITest Share Sheet |
| `examples/native/action` | XCUITest Share Sheet |
| `examples/clip` | Maestro `launch.yaml` |
| `examples/native/clip` | Maestro `launch.yaml` |

Kitchen-sink is **not** a second XCUITest matrix — use discrete packages for process proof.

## C1 spike: attach after prebuild

Sources live **outside** gitignored `examples/*/ios/`:

```text
examples/_harness/uitests/
  ShareSheetSmoke.swift
  scripts/attach-after-prebuild.sh
  README.md  (this file)
```

### Steps

1. Prebuild + Release run one package (example: share):

```bash
cd examples/share
npx expo prebuild --platform ios --clean
npx expo run:ios --configuration Release
```

2. Attach the UI test target (idempotent script):

```bash
./examples/_harness/uitests/scripts/attach-after-prebuild.sh examples/share
```

3. Re-run prebuild **without** `--clean` and confirm the UI test target / sources still exist:

```bash
cd examples/share && npx expo prebuild --platform ios
# then re-run attach script if needed; note whether sources were wiped
```

4. Run tests from Xcode or:

```bash
xcodebuild test \
  -workspace ios/*.xcworkspace \
  -scheme <HostScheme> \
  -destination 'platform=iOS Simulator,name=iPhone 16,OS=18.0' \
  -only-testing:ExpoTargetsShareSheetUITests
```

Pin the iOS Simulator OS version in the PR body when recording results (Share Sheet automation is OS-fragile).

### Spike outcome checklist

- [ ] Attach script adds a UI test target without hand-editing pbxproj by eye
- [ ] Sources under `_harness/uitests/` are copied or referenced; survive or are re-applied after prebuild
- [ ] At least one Share Sheet path green 3× locally on the pinned sim
- [ ] Document flake notes in the PR body

If any box fails the gate → re-grill; do not merge.

## C2: Maestro clip launch

```bash
# Release build of examples/clip (and native/clip)
maestro test examples/clip/.maestro/launch.yaml
maestro test examples/native/clip/.maestro/launch.yaml
```

Flows use `openLink` / optional security-dialog subflow, then assert host `text-last-payload` after handoff seed from the clip path. App Clip card / NFC / production AASA remain README-manual.

## Path to non-blocking macOS CI (out of scope for land)

Later optional label-gated workflow: prebuilt `.app` + pinned sim + `xcodebuild test` / Maestro. Keep non-blocking until locally green 3×.

## Post-C roadmap (deferred spikes)

Best-effort real-process automation for **messages**, **stickers**, and **widgets** as separate spikes — not part of PR C merge.
