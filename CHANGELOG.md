# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Android Share Extension Support**: Full React Native support for Android share extensions
  - Share extensions now work on both iOS and Android with the same codebase
  - Automatic activity registration in AndroidManifest.xml with ACTION_SEND/ACTION_SEND_MULTIPLE intent filters
  - Support for multiple MIME types (text/plain, image/*, video/*, */*)
  - ExpoTargetsExtensionModule implementation for Android with `closeExtension()`, `openHostApp()`, and `getSharedData()`
  - Automatic theme generation for share activities
  - Source set configuration for React Native share activities
  - Works in both Debug and Release modes (unlike iOS which requires Release)
- **Android Action Extension Support**: Action extensions now supported on Android
- **Comprehensive Documentation**: Added Android-specific documentation for share extensions
  - Platform-specific considerations and architecture differences
  - Testing guidelines for Android share sheet
  - Debugging strategies with adb logcat
  - Memory considerations
- **Updated Examples**: `bare-rn-share` and `extensions-showcase` now support both iOS and Android
- **Tests**: Added comprehensive Android share extension test suite
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
