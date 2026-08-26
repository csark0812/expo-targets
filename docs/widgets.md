# Widgets and Live Activities

**Source of truth for** WidgetKit / ActivityKit ownership in expo-targets.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-14 -->

## Ownership

expo-targets owns **native WidgetKit home-screen widgets** and **ActivityKit Live Activities** as first-class Apple targets. They share the same config-plugin spine as other extensions. Showcase tables use plain production checkmarks for `widget` on iOS and Android; ownership and Live Activity ceilings live here and in [limits.md](./limits.md), not as README footnotes.

Official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) remains a valid choice for React / Expo-UI-first widgets on SDK 56+. It is **not** a soft-deprecate handoff for this library. Prefer this package when you already use expo-targets for share / clip / messages and want one config-plugin spine.

## Dual engines

Do **not** configure both the `expo-widgets` **config plugin** and expo-targets widget targets in the same app. `expo-targets doctor` **fails** (not warns) when both are present. Pick one generator per app.

expo-targets can depend on `expo-widgets` **as a private library** for the layout sandbox. That is fine. Do **not** add `"expo-widgets"` to `plugins` when you use expo-targets widgets.

## UI modes

| Mode | Config | iOS | Android |
| --- | --- | --- | --- |
| **native** | no `entry` | SwiftUI deepen under `targets/<name>/ios/` | Glance / RemoteViews deepen under `targets/<name>/android/` (chrome + Bump) |
| **expo-ui** | `entry` + `createTarget(name, Layout)` with `'widget'` directive | expo-widgets layout sandbox (`WidgetsEntryView`) | Same `setData` props → Glance deepen with chrome + Bump (no JS sandbox in App Widget process) |

`type: 'widget' | 'watch-widget'` + `entry` **infers** `expo-ui` (full React Native Views are illegal in WidgetKit).

### Host verbs (expo-widgets → expo-targets)

| expo-widgets | expo-targets |
| --- | --- |
| `createWidget(name, Layout)` | `createTarget(name, Layout)` + `entry`, or `createTarget('Folder').widget('Kind', Layout)` |
| `updateSnapshot(props)` | `setData(props)` on a widget **kind** handle (refresh implied) |
| `updateTimeline(entries)` | `setTimeline(entries)` — `{ date, props }` |
| `getTimeline()` | `getTimeline()` |
| `reload()` | `refresh()` |

Example: `examples/widgets/targets/hello-expo-ui`.

## Two filesystem zones

| Zone | Path | Write policy | Git |
| --- | --- | --- | --- |
| CNG generated (sealed) | `ios/<App>/ExpoTargetsGenerated/` | Always rewrite on prebuild | Gitignored |
| Sealed target build | `ios/<App>/ExpoTargetsGenerated/<Product>/` | Always rewrite (Info.plist, assets, stubs) | Gitignored |
| User deepen | `targets/<name>/ios/` | Never overwrite if exists; scaffolder creates once | Commit |

Never edit `ExpoTargetsGenerated/`. Host Live Activity **attributes** + **bridge** (and App Shortcuts shells) are **flat** `*.swift` at the ExpoTargetsGenerated root. Per-target sealed artifacts (Info.plist, entitlements, Assets, RN stubs, Safari Resources) live in a **product subdirectory** named with the sanitized Xcode product name. Put `ActivityConfiguration` UI under `targets/<widget>/ios/`.

Host CNG deletes only root-level `*.swift` under `ExpoTargetsGenerated/`. It never recursively wipes product subdirs.

## Live Activity config

```json
{
  "type": "widget",
  "name": "OrderWidget",
  "ios": {
    "kinds": [
      { "name": "OrderWidget" }
    ],
    "liveActivity": {
      "attributesName": "OrderAttributes",
      "static": { "orderId": "string" },
      "contentState": { "status": "string", "progress": "double" }
    }
  }
}
```

`attributesName` is the source of truth. Use the typed factory — unknown names throw with the configured list:

```ts
import { LiveActivity } from 'expo-targets';

if (!(await LiveActivity.areActivitiesEnabled())) {
  // ActivityKit unavailable (Low Power, Focus, unsupported device, …)
}

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
npx expo-targets add
# choose Widget / Live Activity — then native | expo-ui
# or: npx expo-targets add widget my-widget --ui expo-ui
# optional: --configurable (Edit Widget) · --live-activity
```

- **native (default)** — SwiftUI / Glance deepen under `targets/<name>/ios|android/`.
- **expo-ui** — writes `entry` + `createTarget(name, Layout)` with the `'widget'` directive; CNG emits `ExpoUiWidget` (+ optional AppIntentConfiguration / `WidgetLiveActivity`).
- **Configurable (Edit Widget)** — native scaffolds `AppIntentConfiguration` under user deepen; expo-ui uses `ios.configuration` → sealed AppIntent + `environment.configuration` in Layout.
- **Live Activity** — writes `ios.liveActivity`. Native: `LiveActivity.swift` deepen + typed CNG attributes. Expo-ui: same entry registers `createLiveActivityLayout` + Bundle includes `WidgetLiveActivity()` (blob attrs; skip typed CNG).

See [`examples/trick`](../examples/trick) for a full host + widget pairing and
[`examples/widgets`](../examples/widgets) for static, expo-ui, and RemoteViews examples.

## Configurable widgets (Edit Widget)

iOS "Edit Widget" (long-press → Edit) uses WidgetKit **App Intent**
configuration (`AppIntentConfiguration`, iOS 17+).

### Native deepen

The scaffolder can emit this under `targets/<name>/ios/` (user deepen, not CNG).

Scaffolded shape (intent name is `<PascalName>ConfigurationIntent`):

```swift
// targets/hello-widget/ios/Widget.swift (user deepen — not CNG)
struct HelloWidgetConfigurationIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Display"
  @Parameter(title: "List") var listId: String?
}

struct HelloWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: HelloWidgetConfigurationIntent.self, provider: Provider()) { entry in
      HelloWidgetView(entry: entry)
    }
    .configurationDisplayName("Hello Widget")
  }
}

// Provider (AppIntentTimelineProvider): intent.listId → App Group UserDefaults suite, then read back.
```

From the host app, keep the widget in sync after in-app picks (use the **kind** handle when `ios.kinds` lists multiple products):

```ts
const popl = createTarget("PoplWidgets");
const widget = popl.widget("HelloWidget"); // or createTarget("HelloWidget") for 1:1
widget.storage.set("listId", selectedId);
widget.refresh();
// or: widget.setData({ listId: selectedId });
```

### Expo-ui

Set `ios.configuration` on the target (or `add widget … --ui expo-ui --configurable`). CNG emits AppIntentConfiguration; Layout reads `environment.configuration`:

```json
{
  "ios": {
    "configuration": {
      "title": "Hello Expo UI Configuration",
      "parameters": {
        "listId": { "title": "List", "type": "string", "default": "default" }
      }
    }
  }
}
```

```tsx
function Layout(props, environment) {
  'widget';
  const listId = environment.configuration?.listId;
  return <Text>{listId}</Text>;
}
```

Use the same `appGroup` as `expo-target.config.json`.

### Buttons + push

- `addUserInteractionListener` — widget Button presses (iOS AppIntent → host; Android Glance/RemoteViews Bump → `ExpoTargetsStorage` `onUserInteraction` with the same event shape).
- `createLiveActivityLayout(name, slots)` — multi-slot LA UI in the same entry as the home Layout; `LiveActivity.create(attributesName)` still starts/updates/ends.
- `ios.liveActivity.pushType: "token"` — native CNG requests ActivityKit push tokens; `addPushToStartTokenListener` for push-to-start. Simulator cannot prove APNs — Devicewright CLAIMS for DI / push / StandBy.

## Android widgets

Android home-screen widgets (Glance / RemoteViews) are **first-class** in expo-targets (Kotlin Compose deepen under `targets/<name>/android/*.kt`, same layout as `ios/*.swift`). Same Devicewright DoD as iOS when green.

**Parity with iOS expo-ui is Glance deepen, not a JS sandbox.** App Widget cannot run the `'widget'` layout. The demo contract is:

- Opaque chrome (white background)
- Seeded `message` + `taps` from host `setData`
- `Bump` button → increments taps, refreshes the tile, emits `addUserInteractionListener` (`source` / `target`)

See `examples/widgets` (`HelloExpoUi` has two expo-ui kinds plus `ios.liveActivity`; `HelloRemoteViewsBundle` has two Android providers). Scaffolded Glance targets get the same chrome + Bump stub.

One `type: widget` folder can list many iOS picker products in `ios.kinds` (one `.appex`) and many Android `AppWidgetProvider` rows in `android.providers[]`. `supportedFamilies` on a kind is sizes of that row, not extra products.

One generator per app if official `expo-widgets` Android lands. ActivityKit / Dynamic Island / StandBy remain iOS-only; `LiveActivity.*` on Android maps to an **ongoing-notification helper** (same JS API; see `examples/widgets`). See [limits.md](./limits.md) and [configuration.md](./configuration.md) Android matrix.

## Related

- [api.md](./api.md) — `LiveActivity` runtime
- [configuration.md](./configuration.md) — `ios.kinds` and `ios.liveActivity` schema
- [limits.md](./limits.md) — lib floor vs Apple gates
- [deprecations.md](./deprecations.md) — roadmap policy
- [getting-started.md](./getting-started.md)
