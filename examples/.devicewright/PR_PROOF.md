# Devicewright PR proof checklist

**Source of truth for** operator pre-merge Devicewright proof on stacked type PRs.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-01 -->

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
