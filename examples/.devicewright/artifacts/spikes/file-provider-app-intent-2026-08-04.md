# Spike: file-provider seed UI + app-intent Shortcuts run (2026-08-04)

Air UDID `0E7FA53F-23B3-4F10-BAE1-AED7515401B2`, DW `0.1.14`, iOS 26.5 simruntime.

## file-provider

### Proven (P deepen)

- Domain register via `NSFileProviderDomain(identifier:displayName:)` (not `pathRelativeToDocumentStorage` — that forces legacy bring-up and `__FILEPROVIDER_V2_EXTENSION_WITHOUT_IMPL`).
- Principal `NSFileProviderReplicatedExtension` + `itemVersion` on every item (missing version → `__FILEPROVIDER_BAD_ITEM_MISSING_ITEMVERSION__`).
- Files Browse lists **ET FileProv**; open shows **ET FileProv is Empty** (no Content Unavailable).
- Opening domain enumerates and writes App Group `fp:marker` / `fp:lastFile=et-fp-seed.txt` → matrix `fp-appgroup` + `fp-deepen-ok`.

### Still miss

- Seed file **not** visible in Files AX (`files-seed-missing`). Domain opens empty despite enumerator `didEnumerate([seed])`.
- Screens: `artifacts/spikes/fp-domain-open.png`, `fp-content-unavailable.png` (pre-fix).

### Root causes fixed along the way

1. `@objc(FileProviderExtension)` vs plist `$(PRODUCT_MODULE_NAME).FileProviderExtension`
2. Legacy domain initializer with Replicated principal
3. Missing `itemVersion` aborting `item(for:)`

## app-intent

### Proven

- Host `AppShortcutsProvider` must live in the **main app target** (`plugins/withHostAppShortcuts.js` → `ETAppShortcuts.swift`). Expo pod metadata has `autoShortcuts`, but Xcode does **not** merge them into `ETAppIntent.app/Metadata.appintents` (only `actions` merge).
- After host inject: Shortcuts lists **ET Greet** under ET AppIntent (`shortcuts-action-visible`).
- pluginkit still lists `appintents-extension`.

### Still miss

- Tapping ET Greet → alert **Unable to run App Shortcut** (screenshot `ai-et-greet-tap.png`).
- Tried: host intent + provider in app binary, `openAppWhenRun=true`, remove appex `ETGreetIntent`, retap / Run chrome. App Group `ai:*` never written → `shortcuts-list-only`.

### Verdict

- **file-provider**: deepen green via App Group on open; seed *UI* leftover.
- **app-intent**: list floor green; Shortcuts *run* leftover on Air Sim (host metadata correct; system still refuses run).
