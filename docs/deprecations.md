# Deprecations and roadmap policy

**Source of truth for** deprecation policy and negative-space roadmap constraints.

<!-- doc-meta: owner=eng | last-reviewed=2026-07-30 -->

## Widget soft-deprecate

| Stage                    | Behavior                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Minors (now)**         | Docs handoff to [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/); CLI + `createTarget` warn when `type === 'widget'`; native widgets keep working |
| **Future major**         | Widget API / scaffolding may be removed                                                                                                                               |
| **Expo Android widgets** | When Expo covers Android widgets, this library may drop the widget surface entirely                                                                                   |

iOS widget investment: **shared spine only**. Android widgets: **bridge-grade** until the Expo exit ramp above.

## Config-only types freeze

Do **not** add new config-only extension types (stubs that only generate Xcode targets). Polish production-ready types instead: share, action, clip, messages, stickers, wallet, and the existing config-only set.

## Dual widget engines

Building coexistence where **both** `expo-widgets` and expo-targets generate WidgetKit widgets in one app is **parked**. Reopen only after a **demand bar**: multiple real projects blocked on split ownership. Default: do not schedule.

## Live Activities

Out of scope. Use `expo-widgets`.

## Related

- [widgets.md](./widgets.md) — handoff and coexistence
- [AGENTS.md](../AGENTS.md) — agent posture summary
