# expo-targets-cli

**Source of truth for** the `expo-targets` CLI (`doctor`, bare-RN `sync`).

<!-- doc-meta: owner=eng | last-reviewed=2026-08-05 -->

## Published entry

The user-facing binary ships with the **`expo-targets`** npm package:

```bash
npx expo-targets doctor
npx expo-targets sync
```

CLI sources live in `packages/expo-targets/cli/` (built into `cli/build/`). This workspace package (`@expo-targets/cli`) is a development mirror; it is **not published** separately.

## Commands

| Command | Status |
| --- | --- |
| `doctor` | **Implemented** — validates plugin, Metro, App Groups, entries, name sync |
| `sync` | **Implemented** — applies iOS config-plugin mods to an existing `ios/` tree (bare RN) |
| `export-safari` | Implemented — exports Safari RN Web bundles to sealed Resources |

### `doctor` checks

**Exit 1 on failure:**

- `expo-targets` in `app.json` / `app.config.*` plugins
- `withTargets` or `withTargetsMetro` in `metro.config.js` when any target has `entry`
- Host + target App Group entitlements consistent
- Target `entry` paths resolve
- Config `name` matches `createTarget('…')` in the target index file

**Warn-only (exit 0 unless other checks fail):**

- Hand-edited or git-tracked files under `ios/*/ExpoTargetsGenerated/`
- Both `expo-widgets` plugin and expo-targets `widget` targets (dual WidgetKit)

## Bare RN `sync`

Applies the same iOS mods as `expo prebuild` against an **existing** `ios/` tree — no full CNG wipe.

```bash
npx expo-targets sync
npx expo-targets sync --dry-run
npx expo-targets sync --clean   # opt-in: remove orphaned sealed dirs + Podfile targets
```

**What it does:**

- Runs the `expo-targets` config plugin via `compileModsAsync` (Xcode project, Podfile, sealed `ios/<App>/ExpoTargetsGenerated/<Product>/`)
- Reports orphaned sealed products / Podfile / Xcode targets with no matching `targets/*/expo-target.config.*`
- `--clean` removes sealed product dirs and Podfile target blocks only; Xcode native targets are report-only

**Recommended path for new projects:** managed Expo + `npx expo prebuild`. Use `sync` when you already have a bare `ios/` tree.

## License

MIT
