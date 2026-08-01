# AGENTS

**Source of truth for** agent cold-start in this repo.

<!-- doc-meta: owner=eng | last-reviewed=2026-07-30 -->

## Product posture

expo-targets owns **Expo’s negative space**: React Native share/action/clip/messages extensions, App Clips, stickers, wallet, and other Apple targets Expo does not ship. Android widgets are **bridge-grade** until Expo covers Android.

- **New React/iOS widgets and Live Activities** → official [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/) (SDK 56+). See [docs/widgets.md](docs/widgets.md).
- **Native iOS widgets** via this lib are soft-deprecated (shared-spine investment only).
- **Do not add** new config-only extension types. See [docs/deprecations.md](docs/deprecations.md).

## Docs SSOT

Canonical docs are listed in [`.skeleton/registry.md`](.skeleton/registry.md). Edit those files only; keep `**Source of truth for**` banners and `doc-meta` comments.

Validation:

```bash
bun run audit:self
bun run validate:changed
```

## Safe commands

- `bun install`, `bun run lint`, `bun run typecheck`, Skeleton audits
- Do **not** start/stop/restart dev servers (`bun run dev`, `expo start`, etc.)

## Packages

| Package                       | Role                                                 |
| ----------------------------- | ---------------------------------------------------- |
| `packages/expo-targets`       | Config plugin, runtime, Metro helper, native modules |
| `packages/create-expo-target` | Interactive scaffolder                               |
| `packages/expo-targets-cli`   | Bare RN `expo-targets sync`                          |
