# AGENTS

**Source of truth for** agent cold-start in this repo.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-02 -->

## Product posture

expo-targets owns **Expo’s negative space**: React Native share/action/clip/messages extensions, App Clips, stickers, wallet, native WidgetKit + Live Activities, and other Apple targets. Android widgets are **bridge-grade**.

- **Native iOS widgets + Live Activities** → this library ([docs/widgets.md](docs/widgets.md)). Official `expo-widgets` is an alternative React/Expo-UI path — do not dual-generate WidgetKit in one app.
- **Do not add** orphan config-only extension types. See [docs/deprecations.md](docs/deprecations.md) and [docs/limits.md](docs/limits.md).

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
