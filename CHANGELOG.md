# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Product posture:** expo-targets leads with extensions Expo does not ship (share/action/clip/messages, etc.). Soft-deprecate native iOS widgets in favor of official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) for React/iOS widgets and Live Activities. See `docs/widgets.md` and `docs/deprecations.md`.
- `create-expo-target`: Share/Action/Clip lead the menu; Widget demoted with an `expo-widgets` handoff confirm; React Native defaults to **Yes** for share/action/clip.
- Docs governed by `@csark0812/skeleton` (registry + `AGENTS.md`).
- Removed the Bun e2e suite (`tests/`) and CI/publish `bun run test` gates.

### Removed

- Automated Bun e2e / build-test harness under `tests/e2e`.
- iOS XCTest suite under `packages/expo-targets/ios/Tests`.
- Legacy `apps/*` example suite (replaced by `examples/*`).

### Deprecated

- Native `type: "widget"` scaffolding and runtime usage warn in minors (CLI + `createTarget`). Removal reserved for a future major or when Expo covers Android widgets.

### Added

- Thin `examples/*` Maestro-ready suite (10 SDK 54 hosts: share, action, messages, clip, stickers, widgets, kitchen-sink, native/share, native/action, native/clip).
- Private `@expo-targets/ios-harness` package: pure-TS Share Sheet XCUITest attach + serial fail-fast `test:share-sheet` (local/MCP; not Ubuntu CI). Replaces `examples/_harness/uitests` bash/ruby attach.
- Maestro clip `launch.yaml` for real clip launch (Release; not Ubuntu CI).
- Action extensions default to App Groups; target `appGroup` always written; `CFBundleDisplayName` from target `displayName` for Share Sheet row titles.
- Skeleton docs SSOT (`@csark0812/skeleton`), `docs/widgets.md`, `docs/deprecations.md`.
- Sharper RN extension runtime errors when `ExpoTargetsExtension` is missing; `getExtensionNativeModule()` helper.
- `withTargetsMetro` entry validation/logging; `scanTargetsDirectory` export.

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

[Unreleased]: https://github.com/csark0812/expo-targets/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/csark0812/expo-targets/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/csark0812/expo-targets/releases/tag/v0.1.0
