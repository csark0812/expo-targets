# Week-7 claim cut list

Published at ship time from `devicewright matrix` → `claim-state.json`.

## Must keep (iOS)

- share
- messages
- photos
- springboard
- settings
- safari

## Cut first if behind

1. wallet
2. clip
3. widgets
4. stickers
5. android-hello (cut from claim if red; ship iOS-only)

## How to refresh

```bash
bun run --filter @expo-targets/devicewright cli -- matrix
# inspect devicewright-artifacts/*/claim-state.json
```
