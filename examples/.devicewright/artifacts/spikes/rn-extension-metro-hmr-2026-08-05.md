# Spike: RN extension DEBUG Metro / HMR (2026-08-05)

Phase 4 DX gate — **operator-only** (agents must not claim Sim green).

## Code shipped

- `ReactNativeViewController` DEBUG: `RCTBundleURLProvider` + `bundleRoot`, Simulator `localhost` default, embedded `main.jsbundle` / `index.jsbundle` fallback, `showError` when both fail.
- Docs: DEBUG can use Metro when `npx expo start` + `withTargets`; Release / no packager = embedded bundle.

## Operator spike (not run in this PR)

1. `cd examples/share` (or action) — `bun install`, `npx expo prebuild`, `npx expo start`.
2. Run appex in DEBUG from Xcode; edit extension JS; confirm HMR or full reload from Metro.
3. Stop Metro; relaunch appex — expect embedded bundle, not blank sheet.
4. `npx expo run:ios --configuration Release` — embedded only.

## Verdict

- **Template + docs**: ready for operator verification.
- **Live HMR on Simulator**: unproven until spike above.
