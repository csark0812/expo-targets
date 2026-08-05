# expo-targets config plugin

**Source of truth for** the config plugin's internal architecture.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-05 -->

This is the internals guide for `packages/expo-targets/plugin`. For user-facing
configuration see [configuration.md](../../../docs/configuration.md).

## ExpoTargetsGenerated (CNG Swift inject)

`withExpoTargetsGenerated` is registered **before** `withTargetsDir` so its
xcodeproj mod runs **after** extension targets exist (Expo mods are LIFO). It
reads `extra.targets` at mod time, rewrites sealed Swift under
`ios/<App>/ExpoTargetsGenerated/` (gitignored), and sets Sources membership
(add-to-build-phase once per needed target). Per-target sealed build output
(Info.plist, entitlements, Assets, stubs) nests under
`ExpoTargetsGenerated/<SanitizedProductName>/` — host LA/App Shortcuts Swift
stays flat at the ExpoTargetsGenerated root. Host CNG only deletes root-level
`*.swift` (never product subdirs).

| Surface | Generated files | Membership |
| --- | --- | --- |
| Live Activity | `{Attributes}.swift`, `{Attributes}Bridge.swift` | attributes → main + widget; bridge → main |
| App Shortcuts | `{Intent}.generated.swift`, `ExpoTargetsAppShortcuts.swift` | main |
| Target sealed build | `Info.plist`, `generated.entitlements`, Assets, stubs | extension product |
| Perform hooks | _(not generated)_ `targets/*/ios/{Hook}.swift` | main (user-owned) |

User deepen Swift stays under `targets/*/ios/` and is never overwritten. See
[widgets.md](../../../docs/widgets.md) and [configuration.md](../../../docs/configuration.md).

## Observe → Plan → Apply

The iOS pipeline is split into four layers. Data flows one way, and each layer
has exactly one job.

| Layer | Directory | Job | Side effects |
| ------- | ---------------------- | ------------------------------------------------ | ----------------- |
| Domain | `src/domain` | Static facts about extension types | none |
| Observe | `src/ios/observe` | Read the world (target directory, `pods.rb`) | reads |
| Plan | `src/ios/plan` | Decide everything, as pure functions returning data | none |
| Apply | `src/ios/apply` | Execute a plan against disk, the pbxproj, the Podfile | writes / mutates |

```
withIOSTarget            resolves props per target from expo-target.config
  └── withXcodeChanges   orchestration only
        ├── observe/workspace      → TargetWorkspace   (what exists on disk)
        ├── plan/compose           → XcodeTargetPlan   (what should exist)
        ├── apply/fs/applyTargetPlan   writes Info.plist, Swift, assets
        └── apply/pbx/applyTargetPlan  creates the native target, settings, phases
```

### Domain (`src/domain`)

`characteristics.ts` is the single source of truth for per-type facts:
product type, frameworks, extension point identifier, base Info.plist, and the
behavioral flags `isReactNativeNative`, `isReactNativeWeb`, and
`needsIsolatedSearchPaths`. `rnCompat.ts` and `appGroups.ts` derive their
predicates from those flags rather than keeping their own lists, so adding a
type means editing one map. `deployment.ts`, `bundleIds.ts`, and `types.ts`
re-export the maps that still live in `src/config.ts`.

### Observe (`src/ios/observe`)

The only place in the iOS pipeline that globs or stats target directories.
`buildTargetWorkspace` returns a `TargetWorkspace` describing what the user
actually wrote (Swift files, custom assets, Safari resources). Planners take a
`TargetWorkspace` and never touch the filesystem, which is what makes them
testable without fixtures.

### Plan (`src/ios/plan`)

Pure functions, one per concern: `identity`, `infoPlist`, `buildSettings`,
`swiftSources`, `assets`, `safari`, `entitlements`, `embed`, `podfile`.
`compose.ts` aggregates them into an `XcodeTargetPlan`. A plan is plain data:
paths to write, contents to write, build settings to set. Nothing in `plan/`
is allowed to write, mutate, or read the filesystem.

### Apply (`src/ios/apply`)

- `apply/fs` — writes the plan to disk (Info.plist, entitlements, generated
  Swift, asset catalogs, sticker packs, Safari resources).
- `apply/pbx` — mutates the parsed Xcode project: target lifecycle, build
  settings, build phases, groups, file references, embedding.
- `apply/podfile` — scans and edits `Podfile` text.

Appliers must be idempotent: a second prebuild over the same project produces a
byte-identical pbxproj. Import PBX helpers from `src/ios/apply/pbx` and Podfile
helpers from `src/ios/apply/podfile` — there are no compatibility shims under
`utils/`.

## Adding a test

Tests are colocated with the code they cover and run with `bun test`.

- **Unit (L1/L2)** — `foo.test.ts` next to `foo.ts`. Planner tests build a fake
  `TargetWorkspace` literal instead of touching disk; see
  `src/ios/plan/planners.test.ts`. PBX tests load a fixture with
  `test-utils/loadPbx` and assert structure with `test-utils/assertPbx`; see
  `src/ios/apply/pbx/embed.test.ts`.
- **Integration (L3)** — `*.integration.test.ts`. Scaffolds a temp project with
  `test-utils/tempDir`, copies a pbxproj fixture, and drives the real mod; see
  `src/ios/config-plugins/withXcodeChanges.integration.test.ts`. Must run on
  Linux without Xcode.

Fixtures live in `plugin/__fixtures__`: `pbx/minimal-app` (hand-authored),
`pbx/prebuild-stripped` (prebuild-shaped, see its `STRIP.md`), and
`targets/*` for target configurations. Shared helpers live in
`plugin/test-utils` (`loadPbx`, `assertPbx`, `tempDir`, `normalizePlist`,
`normalizePodfile`).

Commands:

```bash
bun run test:unit         # everything under packages/expo-targets
bun run test:integration  # the L3 pipeline test only
bun run typecheck
bunx biome check <paths>
```

## Expansion slots

The layering is iOS-first but deliberately open in these places:

| Slot | Where it goes |
| ----------------------- | -------------------------------------------------------------- |
| Android | `src/android/*` — bridge-grade today; an `android/{observe,plan,apply}` split mirrors iOS when Expo's Android story settles |
| Target discovery | `src/withTargetsDir.ts` — finds `targets/*` and their configs |
| Metro | `packages/expo-targets/metro.js` — entry resolution for RN extensions |
| Runtime | `packages/expo-targets/src` — JS API and native modules |
| Scaffolding | `packages/create-expo-target` — templates for new targets |
| Bare workflow | `packages/expo-targets-cli` — `expo-targets sync` |

New extension types start in `src/domain/characteristics.ts`; if a type needs
behavior instead of data, add a flag there rather than a branch in the plan
layer. Orphan config-only stubs are closed to additions — see
[deprecations.md](../../../docs/deprecations.md).
