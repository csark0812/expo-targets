# AGENTS

**Source of truth for** agent cold-start in this repo.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-10 -->

Humans: see [CONTRIBUTING.md](./CONTRIBUTING.md) for install, CI, Biome, and release.

## Product posture

expo-targets owns **Expo’s negative space**: React Native share / action / clip / messages extensions, App Clips, stickers, wallet, native WidgetKit + Live Activities, and other Apple targets. Android is an **API-ceiling dual** spine (~40% of types): W0–W3 shipped (widgets through DocumentsProvider, Autofill, IME, CallScreening, Print, VpnService). The ceiling also includes **W4-in-1.0 partials** and **Wear strong** (`watch` / `watch-widget`).

- **Native iOS widgets + Live Activities** → this library ([docs/widgets.md](docs/widgets.md)). Official `expo-widgets` is an alternate React / Expo-UI path. Do not dual-generate WidgetKit in one app (same one-generator rule if Expo ships Android widgets).
- **Android ledger** → `TYPE_CHARACTERISTICS.androidBucket` / `androidComponent` in the plugin domain.
- **Do not add** orphan config-only extension types (iOS or Android). See [docs/deprecations.md](docs/deprecations.md) and [docs/limits.md](docs/limits.md).

## Sealed zones

| Zone | Path | Policy |
| --- | --- | --- |
| CNG sealed | `ios/<App>/ExpoTargetsGenerated/` | Always rewrite; gitignored; **never edit** |
| User deepen | `targets/<name>/ios/` | Commit; scaffolder creates once |

## Docs SSOT

Canonical docs are listed in [`.skeleton/registry.md`](.skeleton/registry.md). Edit those files only. Keep `**Source of truth for**` banners and `doc-meta` comments.

Validation:

```bash
bun run audit:self
bun run validate:changed
```

## Safe commands

- `bun install` (needs `NODE_AUTH_TOKEN` for `@csark0812/devicewright` — [AUTH.md](examples/.devicewright/AUTH.md))
- `bun run lint`, `bun run typecheck`, `bun run build`
- `bun run test:unit`, `bun run test:integration`, `bun test` (package-scoped)
- Skeleton: `bun run audit:self`, `bun run validate:changed`
- Do **not** start, stop, or restart dev servers (`bun run dev`, `expo start`, and similar)
- Devicewright matrix / `expo run:ios`: **operator-only** (humans boot Simulator). Agents must not claim CI greens for Devicewright.

## Packages

| Package | Role |
| ----------------------------- | ---------------------------------------------------- |
| `packages/expo-targets` | Config plugin, runtime, Metro helper, CLI (`add` / `doctor` / `generate` / `sync`), native modules |
| `packages/expo-targets-cli` | Bare RN sync dev mirror (ships with the `expo-targets` npm package) |
