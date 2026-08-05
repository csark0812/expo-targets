# expo-targets-cli

**Source of truth for** the bare-RN `expo-targets sync` CLI status.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-05 -->

> **Status: unimplemented stub — not published to npm.**
>
> `npx expo-targets sync` / `@expo-targets/cli` does **not** apply config-plugin mods, update the Podfile, or generate sealed `ExpoTargetsGenerated` artifacts today. The package exists in this monorepo for scaffolding only.
>
> **Supported path:** managed Expo → `npx expo prebuild` (CNG).
>
> **Tracking:** https://github.com/csark0812/expo-targets/issues/67

## Intended DoD (when sync is real)

A real `expo-targets sync` must:

1. Compile the same iOS mods as the config plugin against an existing `ios/` tree (no full CNG wipe).
2. Apply Podfile target wiring equivalent to prebuild.
3. Write sealed artifacts under `ios/<App>/ExpoTargetsGenerated/<Product>/`.
4. Support `--dry-run` / `--verbose`; `--clean` only when orphan removal is safe and tested.
5. Be published (`expo-targets` or `@expo-targets/cli`) with docs updated to unfence.

Until then, do not document sync as a working bare-RN workflow.

## License

MIT
