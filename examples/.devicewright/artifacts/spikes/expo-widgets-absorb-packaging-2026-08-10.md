# Spike: expo-widgets sandbox absorb packaging

**Date:** 2026-08-10  
**Owner:** eng  
**Branch:** `chris/expo-ui-triad`  
**Plan:** three-mode UI spine Phase 2 gate

## Question

Pick one Phase 2 packaging path: MIT **vendor-copy**, **private dep** on `expo-widgets` (no public plugin), or **reimplement** the layout sandbox.

## Steps tried

1. `npm pack expo-widgets@57.0.9` — MIT, repo `expo/expo` `packages/expo-widgets`.
2. Inventory sandbox surface (not the config plugin’s WidgetKit generator):
   - Swift: `ios/Widgets/{WidgetsJSRuntime,DynamicView,EntryView,TimelineProvider,Buttons,…}.swift`
   - Bundle stubs: `bundle/{index,react-stub,react-native-stub,expo-stub,jsx-runtime-stub}.ts`
   - Metro: package `metro.config.js` (stubs RN/expo; projectRoot = package)
   - Scripts: `scripts/build-bundle.mjs`, `xcode-build-bundle.sh`
   - Runtime: JSContext `__expoWidgetRender(props, environment)` → node dict → `WidgetsDynamicView`
3. Confirmed expo-targets has **no** in-repo copy of this stack; dual-engine doctor is warn-only today.

## Decision

**PRIVATE DEP (v1) — GO**

| Pick | Verdict |
| --- | --- |
| **Private dep on `expo-widgets`** | **Ship** — depend for sandbox Swift/bundle/Metro scripts; **do not** register the `expo-widgets` config plugin. expo-targets remains the sole WidgetKit Xcode generator. Doctor **fails** if both plugins appear in app config. |
| Vendor-copy | Defer — same MIT rights, higher sync cost; revisit if private dep pulls unwanted autolinking/WidgetKit targets. |
| Reimplement | Out for v1 — reinventing JSContext+DynamicView delays parity. |

### Falsifier

If private dep autolinks a second WidgetKit appex or forces the expo-widgets plugin to run → fall back to **vendor-copy** of `ios/Widgets/*` + `bundle/*` + build-bundle scripts only (MIT attribution), still no upstream plugin.

### Storage ↔ props (locked with plan)

expo-widgets already stores timeline as App Group props blobs. expo-targets `setData`+`refresh` for expo-ui widgets must write the **one-entry timeline blob**; `setTimeline`/`getTimeline` for dated entries; `Layout(props, env)` reads that store.

## Duration

~30 minutes pack inventory + decision.

## Follow-ups

- Phase 2: wire private dep into widget extension pod + bundle phase; map `createTarget` layout registration.
- Phase 1 (parallel): Host-in-RN `ui` triad on share-class — does not need this dep.
- Flip `dualWidgets` warn → fail in the same Phase 2 ship as first expo-ui widget green.
