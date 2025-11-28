# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Live Activities support** — iOS 16.1+ Live Activities with Dynamic Island
  - New `live-activity` target type
  - Lock Screen and Dynamic Island layouts
  - ActivityKit integration
  - Complete Swift template with compact, expanded, and minimal presentations
  - Comprehensive documentation and example app
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
- `npx create-target` CLI scaffolding tool
- Metro wrapper for extension entry points
- 7 comprehensive example apps
- Full documentation suite

### Supported Target Types (iOS)

- `widget` - Home screen widgets (iOS 14+)
- `live-activity` - Live Activities & Dynamic Island (iOS 16.1+)
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

[Unreleased]: https://github.com/csark0812/expo-targets/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/csark0812/expo-targets/releases/tag/v0.1.0
