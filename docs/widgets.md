# Widgets and Live Activities

**Source of truth for** WidgetKit / ActivityKit ownership in expo-targets.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-05 -->

## Ownership

expo-targets owns **native WidgetKit home-screen widgets** and **ActivityKit Live Activities** as first-class Apple targets (negative-space / shared spine with other extensions).

Official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) remains a valid choice for React/Expo-UI-first widgets on SDK 56+, but it is **not** a soft-deprecate handoff for this library. Prefer this package when you already use expo-targets for share/clip/messages/etc. and want one config-plugin spine.

## Dual engines

Do **not** configure both `expo-widgets` and expo-targets to generate WidgetKit widget targets in the same app. Pick one generator per app.

## Two filesystem zones

| Zone | Path | Write policy | Git |
| --- | --- | --- | --- |
| CNG generated (sealed) | `ios/<App>/ExpoTargetsGenerated/` | Always rewrite on prebuild | Gitignored |
| Sealed target build | `ios/<App>/ExpoTargetsGenerated/<Product>/` | Always rewrite (Info.plist, assets, stubs) | Gitignored |
| User deepen | `targets/<name>/ios/` | Never overwrite if exists; scaffolder creates once | Commit |

Never edit `ExpoTargetsGenerated/`. Host Live Activity **attributes** + **bridge** (and App Shortcuts shells) are **flat** `*.swift` at the ExpoTargetsGenerated root. Per-target sealed artifacts (Info.plist, entitlements, Assets, RN stubs, Safari Resources) live in a **product subdirectory** named with the sanitized Xcode product name. Put `ActivityConfiguration` UI under `targets/<widget>/ios/`.

Host CNG deletes only root-level `*.swift` under `ExpoTargetsGenerated/` — it never recursively wipes product subdirs.

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

## Configurable widgets (Edit Widget)

iOS "Edit Widget" (long-press → Edit) uses WidgetKit **App Intent / Intent**
configuration — native Swift only. expo-targets does not generate
`AppIntentConfiguration` for you yet; deepen under `targets/<name>/ios/`.

1. Swap `StaticConfiguration` for `AppIntentConfiguration` (iOS 17+) or
   `IntentConfiguration` + an Intents definition (older).
2. Persist the user's selection in the App Group `UserDefaults` suite (same
   `appGroup` as the target).
3. From the host app, read/write that suite with `createTarget('…').get/set` /
   `AppGroupStorage`, then `refresh()`.

Sketch:

```swift
// targets/hello-widget/ios/Widget.swift (deepen — not CNG)
struct SelectListIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "List"
  @Parameter(title: "List") var listId: String?
}

struct HelloWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SelectListIntent.self, provider: Provider()) { entry in
      HelloWidgetView(entry: entry)
    }
    .configurationDisplayName("Hello Widget")
  }
}

// In Provider timeline: read intent.listId, fall back to App Group defaults.
```

```ts
// Host RN — after the user picks a default list in-app
const widget = createTarget("HelloWidget");
widget.set("listId", selectedId);
widget.refresh();
```

React/Expo-UI-first configurable widgets: see official
[`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) (do not dual-generate).

## Android widgets

Android home-screen widgets (Glance / RemoteViews) stay **bridge-grade** and intentional while Expo’s official widgets stack is iOS-led. Other Apple extension types have no Android equivalent — see [limits.md](./limits.md).

## Related

- [api.md](./api.md) — `LiveActivity` runtime
- [configuration.md](./configuration.md) — `liveActivity` schema
- [limits.md](./limits.md) — lib floor vs Apple gates
- [deprecations.md](./deprecations.md) — roadmap policy
- [getting-started.md](./getting-started.md)
