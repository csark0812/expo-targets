# plugin/test-utils

Shared helpers for the plugin's characterization/unit tests (`bun:test`).

- `tempDir.ts` — `makeTempDir()` / `removeTempDir()` wrappers around `fs.mkdtemp`/`fs.rm`.
- `loadPbx.ts` — `loadPbx(path)` parses a `project.pbxproj` via the `xcode` npm package (`xcode.project(path).parseSync()`).
- `assertPbx.ts` — structural assertions against a parsed PBX project: `findNativeTargetByProductName`, `getProductType`, `assertHasBuildSetting`.
- `normalizePlist.ts` — `normalizePlist(obj)` produces a stable, key-sorted JSON string for comparing parsed plists regardless of property order.
- `normalizePodfile.ts` — `normalizePodfile(content)` collapses whitespace/blank lines for comparing generated Podfile snippets.

## `__fixtures__/pbx/minimal-app/project.pbxproj`

Hand-authored, minimal-but-valid PBX project used by `xcode.apply.test.ts` and
other tests that need a real Xcode project to manipulate. It intentionally
contains only what's required to:

1. Parse cleanly with `require('xcode').project(path).parseSync()`.
2. Look up the main app target by product name (`App`).
3. Exercise build-setting and product-type mutation helpers.

Required PBX sections/objects, at minimum:

- **`PBXProject`** (the `rootObject`) — references `mainGroup`, `productRefGroup`,
  a project-level `XCConfigurationList`, and lists the app target in `targets`.
- **`PBXNativeTarget` "App"** — `productType =
  com.apple.product-type.application`, `productName = App`, a
  `buildConfigurationList` pointing at its own `XCConfigurationList`, and empty
  `Sources`/`Frameworks`/`Resources` build phases (present but can be empty).
- **`XCConfigurationList` + `XCBuildConfiguration` (Debug/Release)** — both at
  the project level and the target level, so `applyBuildSettings` /
  `assertHasBuildSetting` have real configs to mutate/inspect.
- **`PBXFileReference`** for the `App.app` product (in the `Products` group)
  so `productReference` on the native target resolves to something real.
- **`PBXGroup`** for the main group and the `Products` group.

Everything else (extra source files, resources, embed phases) is omitted on
purpose — tests that need those add them programmatically against this base
fixture rather than baking more fixtures into git.
