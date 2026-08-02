# Widgets example

Native WidgetKit Hello widget with `createTarget` host, Devicewright spine journey, and Maestro smoke.

For Live Activities + multi-target showcase, see [`examples/trick`](../trick). Ownership policy: [`docs/widgets.md`](../../docs/widgets.md).

## OS path (iOS)

1. Host → Seed payload
2. Home Screen → add Hello Widget
3. Widget shows the seeded message

## Android (bridge-grade)

`platforms: ["ios", "android"]` + Glance Kotlin under
`targets/hello-widget/android/.../HelloWidget.kt`.

```bash
npx expo prebuild --platform android
npx expo run:android
```

Prebuild wires Glance deps, `HelloWidgetWidgetReceiver` /
`HelloWidgetUpdateReceiver`, and `widgetprovider_hellowidget` XML.
Other Apple extension types have no Android equivalent — see [`docs/limits.md`](../../docs/limits.md).
