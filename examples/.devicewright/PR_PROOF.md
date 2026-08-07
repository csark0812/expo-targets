# Devicewright PR proof checklist

**Source of truth for** operator pre-merge Devicewright proof on stacked type PRs.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-06 -->

CI does **not** gate Devicewright. Before merging a tranche PR that adds or changes REQUIRED_V2 rows:

1. Run the tranche ids (Release ensure-install as needed):

```bash
bun examples/.devicewright/cli.ts matrix --ids=<id1>,<id2> --live-through=5 --no-fail-fast --ensure-install
```

2. Attach to the PR (comment or artifact upload):
   - The CLI JSON output (`artifactDir`, `claimState`, `results`), **or**
   - Path under `examples/.devicewright/artifacts/…` for that run

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
