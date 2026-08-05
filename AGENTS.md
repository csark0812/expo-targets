# AGENTS

**Source of truth for** agent cold-start in this repo.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-05 -->

Humans: see [CONTRIBUTING.md](./CONTRIBUTING.md) for install, CI, Biome, and release.

## Product posture

expo-targets owns **Expo’s negative space**: React Native share/action/clip/messages extensions, App Clips, stickers, wallet, native WidgetKit + Live Activities, and other Apple targets. Android widgets are **bridge-grade**.

- **Native iOS widgets + Live Activities** → this library ([docs/widgets.md](docs/widgets.md)). Official `expo-widgets` is an alternative React/Expo-UI path — do not dual-generate WidgetKit in one app.
- **Do not add** orphan config-only extension types. See [docs/deprecations.md](docs/deprecations.md) and [docs/limits.md](docs/limits.md).

## Sealed zones

| Zone | Path | Policy |
| --- | --- | --- |
| CNG sealed | `ios/<App>/ExpoTargetsGenerated/` | Always rewrite; gitignored; **never edit** |
| User deepen | `targets/<name>/ios/` | Commit; scaffolder creates once |

## Docs SSOT

Canonical docs are listed in [`.skeleton/registry.md`](.skeleton/registry.md). Edit those files only; keep `**Source of truth for**` banners and `doc-meta` comments.

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
- Do **not** start/stop/restart dev servers (`bun run dev`, `expo start`, etc.)
- Devicewright matrix / `expo run:ios`: **operator-only** (humans boot Simulator) — agents must not claim CI greens for Devicewright

## Packages

| Package | Role |
| ----------------------------- | ---------------------------------------------------- |
| `packages/expo-targets` | Config plugin, runtime, Metro helper, native modules |
| `packages/create-expo-target` | Interactive scaffolder |
| `packages/expo-targets-cli` | Bare RN sync dev mirror (ships with `expo-targets` npm package) |
