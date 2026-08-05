# Extension Updates

Thin host to dogfood **extension JS OTA** via `eas update` + App Group sideload.

Suite how-to: [../README.md](../README.md). Feature docs: [../../docs/react-native-extensions.md](../../docs/react-native-extensions.md#extension-bundle-sideload-with-expo-updates).

## What to look for

| Surface | Marker |
| --- | --- |
| Host | `Host OTA: ota-v1` (`targets/share/otaLabel.ts`) |
| Release share sheet | `OTA: ota-v1` (same file, Hermes-exported into App Group) |

Bump `OTA_LABEL`, publish an update, fetch on device — both should change without a store rebuild.

## Setup (once)

```bash
# From repo root
bun install
cd examples/extension-updates

# Link a real EAS project (writes projectId + updates.url into app.json)
npx eas init
# then: npx eas update:configure

npx expo prebuild --platform ios
# Release build required for App Group load path (DEBUG uses Metro only)
npx expo run:ios --configuration Release
```

## Publish a change

```bash
cd examples/extension-updates

# 1. Edit targets/share/otaLabel.ts → e.g. ota-v2
# 2. Hermes-export share entry + publish host update
npx expo-targets export-extension-bundles
eas update --channel preview --message "ota-v2"
```

Or: `bun run update` (same two steps; uses `--branch preview`).

## On device

1. Open **ET Ext Updates** (Release).
2. Tap **Fetch + sync App Group + reload** (or Check → Fetch).
3. Host label should show `ota-v2`.
4. Tap **Open Share Sheet** → choose **Updates Share** → sheet shows `OTA: ota-v2`.

If the sheet still shows the old label: confirm Release (not Debug), `runtimeVersion` matches, and sync logged `installed>=1`.

## Notes

- Importing `expo-targets` auto-enables `ExtensionUpdates` on the host; this app also calls `ExtensionUpdates.enable()` so the control buttons are obvious.
- `eas init` + `eas update:configure` write `extra.eas.projectId` and `updates.url` into `app.json` (not committed with placeholders).
- Do not commit generated `ios/` / `android/`. Never edit `ExpoTargetsGenerated/`.
