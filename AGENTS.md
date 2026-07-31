# AGENTS.md

## Cursor Cloud specific instructions

`expo-targets` is a **Bun-based monorepo** (no server/database) that publishes an Expo config plugin + CLIs for adding native Apple/Android app-extension targets. Node `>=22` and Bun are required (Bun is installed via `https://bun.sh/install`; it lives at `~/.bun/bin`, added to `PATH` in `~/.bashrc`). Standard scripts live in the root `package.json` and CI is `.github/workflows/test.yml`.

### Services / layout
There are no long-running services. Work happens in three layers: the publishable packages (`packages/expo-targets`, `packages/create-expo-target`, `packages/expo-targets-cli`), the example apps (`apps/*`), and the Bun test suite (`tests/e2e`, its own `bun.lock`).

### Install caveat (important)
`packages/expo-targets` has a `prepare` script that runs its build (`tsc`). A plain `bun install` therefore triggers that build. The update script uses `bun install --frozen-lockfile --ignore-scripts` specifically to skip that step so installs stay reliable — do not remove `--ignore-scripts` unless the build below is fixed. `tests/e2e` deps are installed separately (it is not part of the Bun workspaces).

### Known pre-existing breakage on `main` (not an environment problem)
CI is currently red on `main`. Root cause: `packages/expo-targets/src` references DOM globals (`window`/`document`/`navigator`, e.g. in `src/modules/safari/index.ts` and `src/Target.ts`) while `tsconfig.json` sets `lib: ["ES2020"]` (no `DOM`). Consequences, all stemming from this one issue:
- `bun run typecheck` and `bun run build` fail on the `expo-targets` package. The other two packages (`create-expo-target`, `@expo-targets/cli`) build fine.
- The `tests/e2e` workflow/managed/bare tests fail because they `npm install` the local `expo-targets` (re-triggering the failing `prepare`).
Do not treat these as setup/dependency failures; they require a code/config fix by the maintainer.

### What works on Linux
- Lint: `bun run lint` (`biome lint .`) passes. Note the stricter CI variant `bunx biome ci . --error-on-warnings` reports a few pre-existing formatting diffs.
- Tests: `bun test --cwd tests/e2e` — the config/target-type/api/metro/prebuild tests pass and do not need any build output. (One pre-existing `wallet: Bundle identifier suffix defined` assertion fails independently of setup.)
- Scaffolding: the `create-expo-target` CLI (interactive via `prompts`) generates target files (`expo-target.config.json`, `index.ts`, Swift/Kotlin templates).

### What requires macOS (cannot run on the Linux cloud VM)
Building/running the example apps (`expo run:ios`) and the `tests/e2e` `compilation` + `runtime` suites need macOS + Xcode + CocoaPods + the iOS Simulator. These are out of reach on Linux.
