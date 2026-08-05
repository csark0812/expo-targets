# Share example

React Native share extension with App Group host contract.

## Run

```bash
bun install
npx expo prebuild --platform ios
npx expo run:ios
```

## Devicewright

```bash
# From repo root, after Release install on a booted sim
bun run examples:devicewright:share
```

## OS path (Share Sheet)

1. Open Safari → Share → Example Share → Save
2. Return to host → Refresh → assert payload
