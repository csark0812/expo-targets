# Widgets and expo-widgets

**Source of truth for** widgets handoff and coexistence with official Expo widgets.

<!-- doc-meta: owner=eng | last-reviewed=2026-07-30 -->

## Strong handoff (React / iOS)

For **new iOS home-screen widgets** and **Live Activities** built in React / Expo UI, use official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) (Expo SDK 56+).

Live Activities are **out of scope** for expo-targets — use `expo-widgets`.

## Native iOS widgets in this library

Native SwiftUI / WidgetKit widgets via `type: "widget"` still work and remain in the API, but are **soft-deprecated** as the lead product story:

- Prefer `expo-widgets` for React-first iOS widgets.
- Investment here is **shared-spine only** (App Groups, config plugin, storage) — not a competing React-widget DX.
- Deprecation warnings appear in minors when scaffolding or constructing widget targets; removal is reserved for a future major (or when Expo covers Android widgets). See [deprecations.md](./deprecations.md).

## Android widgets

Android home-screen widgets (Glance / RemoteViews) are **bridge-grade**: supported and intentional while Expo’s widgets stack is iOS-only. When Expo ships Android widgets, this surface may be dropped.

## Coexistence with `expo-widgets`

**Split ownership (supported):** use `expo-widgets` for iOS widgets / Live Activities, and expo-targets for share, action, clip, messages, stickers, wallet, and other non-widget targets in the same app.

**Dual widget engines (unsupported for now):** do not configure both packages to generate WidgetKit widget targets in one app. Revisit only if real projects are blocked on split ownership (demand bar).

## Scaffolding

```bash
npx create-expo-target
# Widget is demoted in the menu; confirm after the expo-widgets handoff prompt
```

For React Native extensions (the recommended lead path), see [getting-started.md](./getting-started.md) and [react-native-extensions.md](./react-native-extensions.md).
