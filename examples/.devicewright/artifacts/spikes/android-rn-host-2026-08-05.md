# Spike: Android Expo RN factory in dedicated Activity

**Date:** 2026-08-05  
**Wave:** 0 (RN host go/no-go)  
**Owner:** eng  
**Branch:** `chris/android-extension-parity` (base PR 71 / `chris/pr2-extension-updates`)

## Question

Can Wave 1 Share/Action Activities host React Native via an Expo factory mirroring iOS `ExpoReactNativeFactory` + strip `expo-updates` / `expo-dev-client`, within share-sheet UX budgets?

## Steps tried

1. Read iOS host: `packages/expo-targets/plugin/src/ios/templates/ReactNativeViewController.swift` — `ExpoReactNativeFactory` / `rootViewFactory.view(withModuleName:)`, App Group sideload, 5 MiB cap.
2. Confirmed Android extension JS APIs now ungated (`src/modules/extension/index.ts`) and Intent bridge + `ExpoTargetsHarnessActivity` exist for native path.
3. No full second-Activity Expo RN cold-start measured on emulator in this spike (no Android prebuild/run in Wave 0 session).

## Evidence / constraints

| Item | Finding |
| --- | --- |
| iOS pattern | Factory + exclusions; not full ExpoAppDelegate |
| Android process | Host APK Activity (no sealed appex) — heavier than iOS appex memory model |
| Bundle budget | ≤ 5 MiB RN bundle bytes (same unit as iOS sideload) |
| Falsifier | If mid-tier emulator cold start to interactive > ~2s for minimal share UI → W1 native-only |

## Decision

**PROVISIONAL GO** — Wave 1 ships **native** `ExpoTargetsShareActivity` / `ExpoTargetsActionActivity` first.

- Native path is the Android DoD for W1 (examples/share dual-platform).
- RN `entry` remains iOS-primary; Android shows a fallback note when `USE_RN` meta is true.
- Full Expo RN Activity host deferred until emulator TTI log exists (or NO-GO stays native-only).

## Duration

~45 minutes design + W1 native implementation session.

## Follow-ups

- Measure cold-start for a future `ExpoTargetsReactActivity` before flipping Android `entry` to live RN.
- W1 DW: share sheet → Activity → Save → host reads SharedPreferences `items`.
- If RN NO-GO permanently: document `entry` as iOS-only for share/action.
