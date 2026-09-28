# agent-device PR proof checklist

**Source of truth for** operator pre-merge agent-device proof on stacked type PRs.

<!-- doc-meta: owner=eng | last-reviewed=2026-09-27 -->

CI does **not** gate agent-device. Before merging a tranche PR that adds or changes REQUIRED_V2 rows:

Cutover requires two consecutive full agent-device matrix runs per platform against the same commit, Release binaries, device, and OS version. The frozen required-row, claims, touchpoint, C1 checklist, must-green, and must-remain-green contracts are the parity baseline. Any capability-gate failure or status/oracle mismatch blocks acceptance; no required row may weaken to `operator`, `stub`, `infra`, red, an unapproved `os-limit`, or soft-green. Historical predecessor-runner artifacts remain read-only context only; there is no active predecessor runner or cutover dependency.

Build and install the current Release hosts first; an `--ensure-install` warm-up may do that, but the warm-up is not acceptance evidence. Then capture a Release-build inventory from the installed device. The command deterministically hashes each installed iOS `.app` bundle or Android base/split APK set and reuses a digest for rows sharing the same host:

Commit the migration and start from a clean working tree before capture. Inventory capture fails while tracked or untracked changes are present, and acceptance rejects a run that cannot prove a clean tree.

```bash
bun run examples:agent-device:release-builds -- --platform=ios --device=<udid> --out=/absolute/path/ios-release-builds.json
bun run examples:agent-device:release-builds -- --platform=android --device=<serial> --out=/absolute/path/android-release-builds.json
```

The resulting file has this contract:

```json
{
  "schemaVersion": 1,
  "platform": "ios",
  "gitSha": "<40-character-current-commit>",
  "workingTreeDirty": false,
  "builds": [
    { "id": "share", "sha256": "<64-character-binary-digest>" }
  ]
}
```

The full iOS inventory must contain exactly the 55 `REQUIRED_V2` ids; Android must contain exactly the 28 `REQUIRED_ANDROID` ids. Rows sharing a host may use the same binary digest. Pass the inventory to every matrix run:

```bash
bun examples/.agent-device/cli.ts matrix --platform=ios --device=<udid> --live-through=5 --no-fail-fast --ensure-install --release-manifest=/absolute/path/ios-release-builds.json
bun examples/.agent-device/cli.ts matrix --platform=android --device=<serial> --live-through=5 --no-fail-fast --release-manifest=/absolute/path/android-release-builds.json
```

After two agent-device runs per platform, run the fail-closed acceptance gate:

```bash
bun run examples:agent-device:acceptance -- \
  --ios=<agent-ios-1>,<agent-ios-2> \
  --android=<agent-android-1>,<agent-android-2> \
  --sha=$(git rev-parse HEAD)
```

The gate rejects missing/duplicate rows, incomplete runs, dirty-tree evidence, missing or inconsistent fork provenance, missing build inventories, different commits/devices/OS versions/binaries, non-approved `os-limit`, any non-green required Android row, changed consecutive statuses, soft-green/empty-surface exits, missing Phase 1 C1 checklist or critical-row oracles, malformed event ordering, and point actions without a descriptor, exact coordinate, adjacent screenshot, matching press, and green behavioral assertion.

1. Run the tranche ids (Release ensure-install as needed):

```bash
bun examples/.agent-device/cli.ts matrix --ids=<id1>,<id2> --live-through=5 --no-fail-fast --ensure-install --release-manifest=/absolute/path/release-builds.json
```

2. Attach to the PR (comment or artifact upload):
   - `examples/.agent-device/artifacts/…/matrix-result.json` (preferred), **or**
   - CLI stdout from `matrix … --json`, **or**
   - Path under `examples/.agent-device/artifacts/…` for that run

   Default `matrix` prints a human summary (not JSON). Use `--json` or the artifact file for proof attach. Live progress is on stderr when TTY; `events.jsonl` is always written under the artifact dir.

3. Confirm each new/changed id is `green` **or** `os-limit` with a matching row in [`claims.ts`](./claims.ts) (same PR).

4. Confirm touchpoint for each id is `concrete` in [`touchpoints.ts`](./touchpoints.ts) (not stub) before claiming green∪os-limit.

5. Do **not** merge on `red`, `operator`, or unapproved `os-limit`.

## Android soft-exit / empty-surface / operator

Android closed-set runs use `REQUIRED_ANDROID` (`--platform=android`). Matrix helpers in [`matrix.ts`](./matrix.ts) reject forbidden exits:

| Forbidden | Meaning | Matrix behavior |
| --- | --- | --- |
| **soft-green** | `status: "green"` while every `steps` entry matches soft-exit evidence only (`launch-host`, `hyphen-ok`, `pm-path`, `dumpsys…`) | Converted to `red` via `assertNotSoftGreen` |
| **empty-surface** | `status: "os-limit"` with only `launch-host` / `hyphen-ok` steps (no honest Locked P attempt) | Converted to `red` |
| **operator** | Non-journey / manual “looks fine” exit (`status: "operator"`) | Hard fail (`ok: false`); not an approved closed-matrix row |
| **unapproved os-limit** | Android `os-limit` without an Android-worded CLAIMS row (`platforms` includes `android`) | Converted to `red` via `assertOsLimitAllowed(id, "android")` |

**Soft-exit evidence** (must not yield green): package installed only, service registered in PackageManager/dumpsys only, or a host button that opens Settings without meeting Locked P. Example fails: `pm path` success; AutofillService in dumpsys but Autofill settings list never shown. Example pass: Master Locked P UI proof observed (AX label / host testID marker).

**Honest attempt:** journey `steps` include waits/taps aimed at Locked P. Returning os-limit without those steps is empty-surface.

Must-green (`native-share`, `native-action`, `notification-content`, `native-notification-content`) and must-remain-green (`share`, `action`, `widgets`, `file-provider`, `keyboard`) have **no** Android draft CLAIMS rows — miss → red only.
