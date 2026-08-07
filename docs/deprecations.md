# Deprecations and roadmap policy

**Source of truth for** deprecation policy and negative-space roadmap constraints.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-06 -->

## Widgets / Live Activities

Native WidgetKit + ActivityKit are **first-class** in expo-targets (not soft-deprecated). See [widgets.md](./widgets.md).

| Stage               | Behavior                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Now**             | Widget + Live Activity scaffolds and examples are supported                                 |
| **Dual engines**    | Still unsupported: do not run expo-widgets and expo-targets WidgetKit generators in one app |
| **Android widgets** | **First-class** Glance/Compose or RemoteViews deepen (not bridge-grade). Same DoD as iOS: registry + scaffold + example + Devicewright (or leftover). One generator per app if official `expo-widgets` Android lands. |
| **Android dual**    | API-ceiling program (~40% of types). Ledger in `TYPE_CHARACTERISTICS` (`androidBucket` / `androidComponent`). W0–W3 shipped (through system services). Ceiling includes W4-in-1.0 partials + Wear strong — no separate W5 Wear wave. No orphan Android stubs outside the ceiling. |

## New extension types (no orphan stubs)

New `ExtensionType` values are allowed **only** when the same PR ships **registry + scaffold template + production example + Devicewright REQUIRED row** (full per-type DoD). Do **not** add config-only stubs that only generate Xcode targets. The same freeze applies to Android backends.

## Related

- [widgets.md](./widgets.md) — WidgetKit / Live Activities ownership
- [limits.md](./limits.md) — lib floor vs Apple gates
- [AGENTS.md](../AGENTS.md) — agent posture summary
- [CONTRIBUTING.md](../CONTRIBUTING.md) — human contributor front door
