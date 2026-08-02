# Widgets and Live Activities

**Source of truth for** WidgetKit / ActivityKit ownership in expo-targets.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-02 -->

## Ownership

expo-targets owns **native WidgetKit home-screen widgets** and **ActivityKit Live Activities** as first-class Apple targets (negative-space / shared spine with other extensions).

Official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) remains a valid choice for React/Expo-UI-first widgets on SDK 56+, but it is **not** a soft-deprecate handoff for this library. Prefer this package when you already use expo-targets for share/clip/messages/etc. and want one config-plugin spine.

## Dual engines

Do **not** configure both `expo-widgets` and expo-targets to generate WidgetKit widget targets in the same app. Pick one generator per app.

## Android widgets

Android home-screen widgets (Glance / RemoteViews) stay **bridge-grade** and intentional while Expo’s official widgets stack is iOS-led. Other Apple extension types have no Android equivalent — see [limits.md](./limits.md).

## Scaffolding

```bash
npx create-expo-target
# choose Widget — native WidgetKit scaffold
```

Live Activities: ship an ActivityKit configuration in the widget extension and start/end from the host (see [`examples/trick`](../examples/trick)).

## Related

- [limits.md](./limits.md) — lib floor vs Apple gates
- [deprecations.md](./deprecations.md) — roadmap policy
- [getting-started.md](./getting-started.md)
