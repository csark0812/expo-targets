# Scripts

**Source of truth for** repo-root maintenance scripts under `scripts/`.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-05 -->

| Script | Purpose |
| --- | --- |
| `compare-bacon-registry.ts` | CI guard: ExtensionType set vs pinned snapshot (`bun run compare:bacon-registry`) |
| `scaffold-bacon-examples.ts` | Scaffold helper for example hosts |
| `merge-scaffold-registry.ts` | Merge scaffold registry rows |
| `add-bacon-types.ts` | Batch helper when landing new ExtensionTypes |
| `fixtures/bacon-target.snapshot.ts` | Snapshot fixture for compare |
| `generated/*` | Generated JSON helpers (`required-rows.json`, `created.json`, `claims.json`) — do not hand-edit as SSOT; regenerate via the scripts that own them |
| `write-example-readme-stubs.ts` | Regenerate thin per-host `examples/*/README.md` stubs from REQUIRED_V2 |
| `docs-guard.test.ts` | Fails if `docs/api.md` / `docs/widgets.md` teach fake `target.set` / `widget.set` |

Biome budgets are relaxed for `scripts/**` (see [CONTRIBUTING.md](../CONTRIBUTING.md)).
