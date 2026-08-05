# Widgets and Live Activities

**Source of truth for** WidgetKit / ActivityKit ownership in expo-targets.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-04 -->

## Ownership

expo-targets owns **native WidgetKit home-screen widgets** and **ActivityKit Live Activities** as first-class Apple targets (negative-space / shared spine with other extensions).

Official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) remains a valid choice for React/Expo-UI-first widgets on SDK 56+, but it is **not** a soft-deprecate handoff for this library. Prefer this package when you already use expo-targets for share/clip/messages/etc. and want one config-plugin spine.

## Dual engines

Do **not** configure both `expo-widgets` and expo-targets to generate WidgetKit widget targets in the same app. Pick one generator per app.

## Two filesystem zones

| Zone | Path | Write policy | Git |
| --- | --- | --- | --- |
| CNG generated (sealed) | `ios/<App>/ExpoTargetsGenerated/` | Always rewrite on prebuild | Gitignored |
| User deepen | `targets/<name>/ios/` | Never overwrite if exists; scaffolder creates once | Commit |

Never edit `ExpoTargetsGenerated/`. Live Activity **attributes** + host **bridge** are generated there (attributes are dual-membered into the main app and the widget). Put `ActivityConfiguration` UI under `targets/<widget>/ios/`.

## Live Activity config

```json
{
  "type": "widget",
  "name": "OrderWidget",
  "liveActivity": {
    "attributesName": "OrderAttributes",
    "static": { "orderId": "string" },
    "contentState": { "status": "string", "progress": "double" }
  }
}
```

`attributesName` is the source of truth. Use the typed factory — unknown names throw with the configured list:

```ts
import { LiveActivity } from 'expo-targets';

const order = LiveActivity.create('OrderAttributes');
const id = await order.start({
  attributes: { orderId: '12' },
  contentState: { status: 'preparing', progress: 0.1 },
});
await order.update(id, { status: 'ready', progress: 1 });
await LiveActivity.endAll();
```

## Scaffolding

```bash
npx create-expo-target
# choose Widget — optional Live Activity bootstrap
```

Opting into Live Activity writes `liveActivity` into `expo-target.config.json`, a one-shot `LiveActivity.swift` UI under `targets/<name>/ios/`, and a `WidgetBundle`. Prebuild then emits attributes + host bridge into `ExpoTargetsGenerated/`.

See [`examples/trick`](../examples/trick) for a full host + widget pairing.

## Android widgets

Android home-screen widgets (Glance / RemoteViews) stay **bridge-grade** and intentional while Expo’s official widgets stack is iOS-led. Other Apple extension types have no Android equivalent — see [limits.md](./limits.md).

## Related

- [api.md](./api.md) — `LiveActivity` runtime
- [configuration.md](./configuration.md) — `liveActivity` schema
- [limits.md](./limits.md) — lib floor vs Apple gates
- [deprecations.md](./deprecations.md) — roadmap policy
- [getting-started.md](./getting-started.md)
