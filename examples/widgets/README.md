# Widgets

WidgetKit and Android widget example. Four targets: native Glance (`HelloWidget`), expo-ui Glance (`HelloExpoUi` — two iOS picker rows plus `ios.liveActivity`), RemoteViews (`HelloRemoteViews`), and a RemoteViews bundle (`HelloRemoteViewsBundle` — two Android picker rows). The host seeds payloads, pins widgets on Android, and controls Live Activities.

Full widget docs: [../../docs/widgets.md](../../docs/widgets.md). Suite how-to: [../README.md](../README.md). Type maturity: [../../docs/configuration.md](../../docs/configuration.md).

Do not use the `expo-widgets` config plugin in the same app as expo-targets `widget` targets.

```bash
npm install
npx expo prebuild --platform ios
npx expo run:ios
# Android
npx expo prebuild --platform android
npx expo run:android
```

From the monorepo root, run `bun install` once before `npm install` in this folder.

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=widgets
```

Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
