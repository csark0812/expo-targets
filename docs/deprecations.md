# Deprecations and roadmap policy

**Source of truth for** deprecation policy and negative-space roadmap constraints.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-02 -->

## Widgets / Live Activities

Native WidgetKit + ActivityKit are **first-class** in expo-targets (not soft-deprecated). See [widgets.md](./widgets.md).

| Stage               | Behavior                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Now**             | Widget + Live Activity scaffolds and examples are supported                                 |
| **Dual engines**    | Still unsupported: do not run expo-widgets and expo-targets WidgetKit generators in one app |
| **Android widgets** | Bridge-grade until/unless Expo’s official Android widgets exit ramp applies                 |

## New extension types (no orphan stubs)

New `ExtensionType` values are allowed **only** when the same PR ships **registry + scaffold template + production example + Devicewright REQUIRED row** (full per-type DoD). Do **not** add config-only stubs that only generate Xcode targets.

See the Bacon compatibility epic / [migrate-from-bacons-apple-targets.md](./migrate-from-bacons-apple-targets.md).

## Related

- [widgets.md](./widgets.md) — WidgetKit / Live Activities ownership
- [limits.md](./limits.md) — lib floor vs Apple gates
- [AGENTS.md](../AGENTS.md) — agent posture summary
