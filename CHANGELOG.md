# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Devicewright expansions (Sim-greenable): share/action(+native) image UTTypes + typed host markers; safari popup/content-script/native-msg host surfaces; content-blocker richer rules + host reload/rule-count; widgets family markers; keyboard type-into-field; photo-edit Done persistence; clip(+native) launchApp invocation; touchpoints updated.
- `docs/limits.md`: max Sim-greenable (**P**) policy, S3a spike gate, leftover register, currently-green expansion backlog.
- Live Activity CLAIMS narrowed to DI / push / StandBy (+ Watch after S3a); NCE expand→custom UI required (removed `notification-content` os-limit row).
- **Product posture:** expo-targets owns Expo’s negative space (share/action/clip/messages/stickers/wallet and related Apple targets). Native WidgetKit + Live Activities are **first-class** here; official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) remains an alternate React/Expo-UI path — do not dual-generate. See `docs/widgets.md` and `docs/deprecations.md`.
- `create-expo-target`: Share/Action/Clip/Messages lead the menu; Widget scaffolds native WidgetKit; React Native defaults to **Yes** for share/action/clip.
- Docs governed by `@csark0812/skeleton` (registry + `AGENTS.md`); bumped to `^1.5.7` (audit hang fix).
- iOS config-plugin pipeline split into Observe → Plan → Apply; Biome replaces ESLint/Prettier.

### Removed

- Automated Bun e2e / build-test harness under `tests/e2e` (and CI/publish `bun run test` gates).
- iOS XCTest suite under `packages/expo-targets/ios/Tests`.
- Legacy `apps/*` example suite (replaced by `examples/*`).

### Added

- `@csark0812/devicewright@^0.1.8`; Trick Live Activity `update` + host controls; `live-activity` in REQUIRED_V2 phase 3.
- Share/action examples: image activation + `kind`/`type` payload markers; native-action return-items; content-blocker `blocker-reload` host module; Safari content_script generation in plugin when `ios.manifest.content_scripts` is set.
- Messages `insertAttachment` (temp UTF-8 file → `MSConversation.insertAttachment`) plus example M3 surfaces: expand/compact, session `sendUpdate`, attachment, Send template.
- Messages Devicewright journey: describePoint-first sheet ladder (`messages-sheet.ts`) — RN MSMessages chrome is AX-tree-opaque on iOS 26.
- Thin `examples/*` Maestro-ready suite (SDK 54 hosts: share, action, messages, clip, stickers, widgets, kitchen-sink, native/share, native/action, native/clip) plus Bacon-parity stub hosts and Devicewright journeys.
- Skeleton docs SSOT (`@csark0812/skeleton`), `docs/widgets.md`, `docs/deprecations.md`, `docs/limits.md`.
- Bacon `ExtensionType` registry parity (`bun run compare:bacon-registry`).
- Sharper RN extension runtime errors when `ExpoTargetsExtension` is missing; `getExtensionNativeModule()` helper.
- `withTargetsMetro` entry validation/logging; `scanTargetsDirectory` export.
- `mcp-dev` package (MCP stdio supervisor; not yet published to npm).

## [0.2.0] - 2025-12-09

### Added

- iOS Wallet extension support (config-only, iOS 13+)
- CI/CD workflows with GitHub Actions
- Automated npm publishing on PR merge

## [0.1.0] - 2025-01-XX

### Added

- Initial release
- iOS extension support (widget, clip, stickers, share, action, messages)
- Android widget support (Glance API + RemoteViews)
- JSON configuration system (`expo-target.config.json`)
- `createTarget()` runtime API for data sharing
- `AppGroupStorage` class for cross-extension communication
- Xcode project manipulation via config plugin
- Gradle manipulation for Android widgets
- Color and image asset generation
- Entitlements sync between app and extensions
- React Native support in share/action/clip extensions
- `npx create-expo-target` CLI scaffolding tool
- Metro wrapper for extension entry points
- 7 comprehensive example apps
- Full documentation suite

### Supported Target Types (iOS)

- `widget` - Home screen widgets (iOS 14+)
- `clip` - App Clips (iOS 14+)
- `stickers` - iMessage sticker packs
- `share` - Share extensions
- `action` - Action extensions
- `messages` - iMessage apps
- `safari` - Safari extensions (config-only)
- `notification-content` - Notification content (config-only)
- `notification-service` - Notification service (config-only)
- `intent` / `intent-ui` - Siri intents (config-only)

### Supported Target Types (Android)

- `widget` - Home screen widgets (Glance API or RemoteViews)

[Unreleased]: https://github.com/csark0812/expo-targets/compare/v0.2.7...HEAD
[0.2.0]: https://github.com/csark0812/expo-targets/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/csark0812/expo-targets/releases/tag/v0.1.0
