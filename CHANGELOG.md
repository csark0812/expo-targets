# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Android widget Kotlin lives at `targets/<name>/android/<File>.kt` (same layout as `ios/*.swift`). The `package` line still holds the FQCN.

### Added

- One `widget` target can list many iOS WidgetKit picker products in `ios.kinds` (one `.appex`) and many Android `AppWidgetProvider` rows in `android.providers[]`.
- Live Activity config lives on `ios.liveActivity` (`attributesName`, `static`, `contentState`, `pushType`). `ios.kinds` is gallery WidgetKit only. A `{ "type": "live-activity" }` kinds row fails.

## [1.0.3] - 2026-08-10

### Added

- Phase 2 expo-ui widget parity DoD: `add widget` native | expo-ui scaffold, configurable Edit Widget, Live Activity expo-ui slots (`createLiveActivityLayout`), Button / Bump `addUserInteractionListener`.
- Android Glance / RemoteViews chrome + Bump interaction parity with iOS host events (`source` / `target`).

### Fixed

- Devicewright widgets triad greens on iOS and Android after Phase 2.

## [1.0.2] - 2026-08-10

### Fixed

- Do not invent a `tsconfig` `include` for ambient `.expo/types` when the app only extends `expo/tsconfig.base` (#77).

## [1.0.1] - 2026-08-10

### Added

- Expo-ui widget triad absorb: private `expo-widgets` layout sandbox, dual-engine doctor **fail**, `hello-expo-ui` example, Android pin greens (#78).

## [1.0.0] - 2026-08-10

### Added

- **DX Magic:** `npx expo-targets add` (interactive or `add <type> <name>`); scaffolder in `expo-targets`; RN scaffold emits `createTarget`; ambient LA payload typing via `.expo/types/expo-targets.d.ts`; `setData(data, { refresh? })`; doctor EAS / signing co-pilot.
- Host wiring by default (plugin, App Groups, metro `withTargets`, package.json dep; `--no-wire` escape); `doctor` | `generate` | `export-safari` | `sync`; sealed overwrite warnings; DEBUG Metro harden; Safari PBX web-export; configurable widget scaffold; bare `sync` via `compileModsAsync`.
- App Group extension OTA (`ExtensionUpdates` / `export-extension-bundles`) with Hermes sideload.
- Android API-ceiling dual through W3 + **W4-in-1.0 partials** + **Wear strong**; Devicewright Android REQUIRED matrix through Wear + Locked P (#76).

### Changed

- Metro helper canonical name: `withTargets` (`withTargetsMetro` deprecated alias).
- Getting-started path: install → `npx expo-targets add` → prebuild → run.
- Soft-fail host wiring when `app.config.js` / `ts` cannot be auto-patched (doctor remains the hard gate).
- Product posture: native WidgetKit + Live Activities first-class; do not dual-generate with the `expo-widgets` config plugin. See `docs/widgets.md`.

### Removed

- Standalone `create-expo-target` package from the monorepo (one-shot npm redirect remains a release checklist item — see CONTRIBUTING).
- Upstream ExtensionType registry compare scripts / CI gate.
- `docs/migrate-from-bacons-apple-targets.md`.

## [0.2.8] - 2026-08-05

### Fixed

- **`excludedPackages` for nested RN extensions (#42):** Config was plumbed but ignored. Nested targets now record exclusions in the Podfile and a `post_integrate` hook strips those packages from `expo-configure-project.sh` then regenerates `ExpoModulesProvider.swift` (nested `use_expo_modules!(exclude:)` is a no-op). Fixes blank Messages/share sheets when the host links `expo-updates` / `expo-dev-client`.
- **Messages `displayName` (#22):** `CFBundleDisplayName` and `CFBundleName` both receive the literal `displayName` (not `$(PRODUCT_NAME)` / `*Target`).

### Changed

- **Breaking (iOS sealed build):** Plugin-generated target artifacts move from `targets/*/ios/build/` to `ios/<App>/ExpoTargetsGenerated/<SanitizedProductName>/` (Info.plist, entitlements, Assets, RN/Messages stubs, Safari Resources). Host Live Activity / App Shortcuts Swift stays flat under `ExpoTargetsGenerated/*.swift`. Re-run `expo prebuild` (or `expo-targets sync`). Update any scripts that `cp` into the old path — on apply the plugin deletes that target’s legacy `targets/<name>/ios/build` when present. Do not hand-edit sealed or legacy build dirs. See `docs/widgets.md` and Safari Resources in `docs/configuration.md`.
- Removed Maestro example smoke YAML / `examples:maestro:*` scripts — Devicewright is the sole example journey surface (`examples/.devicewright/`).
- Devicewright expansions (Sim-greenable): share/action(+native) image UTTypes + typed host markers; safari popup/content-script/native-msg host surfaces; content-blocker richer rules + host reload/rule-count; widgets family markers; keyboard type-into-field; photo-edit Done persistence; clip(+native) launchApp invocation; touchpoints updated.
- `docs/limits.md`: max Sim-greenable (**P**) policy, S3a spike gate, leftover register, currently-green expansion backlog.
- Live Activity CLAIMS narrowed to DI / push / StandBy (+ Watch after S3a); NCE expand→custom UI required (removed `notification-content` os-limit row).
- **Product posture:** expo-targets owns Expo’s negative space (share/action/clip/messages/stickers/wallet and related Apple targets). Native WidgetKit + Live Activities are **first-class** here; official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) remains an alternate React/Expo-UI path — do not dual-generate. See `docs/widgets.md` and `docs/deprecations.md`.
- `docs/widgets.md`: configurable widgets (Edit Widget) via native `AppIntentConfiguration` + App Group / `createTarget` (issue #15).
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
- File Provider example: host `NSFileProviderManager.add` domain module; journey requires Files Browse to list **ET FileProv**.
- App Intent example: real `SayHelloIntent` + `AppShortcutsProvider`; journey requires Shortcuts action visibility.
- Thin `examples/*` suite (SDK 57 hosts) plus Devicewright journeys.
- Skeleton docs SSOT (`@csark0812/skeleton`), `docs/widgets.md`, `docs/deprecations.md`, `docs/limits.md`.
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
- Example apps and documentation suite

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

[Unreleased]: https://github.com/csark0812/expo-targets/compare/v1.0.3...HEAD
[1.0.3]: https://github.com/csark0812/expo-targets/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/csark0812/expo-targets/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/csark0812/expo-targets/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/csark0812/expo-targets/compare/v0.2.8...v1.0.0
[0.2.8]: https://github.com/csark0812/expo-targets/compare/v0.2.7...v0.2.8
[0.2.0]: https://github.com/csark0812/expo-targets/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/csark0812/expo-targets/releases/tag/v0.1.0
