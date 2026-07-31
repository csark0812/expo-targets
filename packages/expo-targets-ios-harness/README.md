# @expo-targets/ios-harness

**Local / MCP only.** Private Share Sheet XCUITest orchestration for expo-targets examples. Not a Ubuntu CI merge gate. **Release** simulator builds required.

## Commands

```bash
# Attach UITest target + scheme env after prebuild (idempotent)
bun run --filter @expo-targets/ios-harness attach -- examples/share

# Serial fail-fast matrix (share, action, native/share, native/action)
bun run --filter @expo-targets/ios-harness test:share-sheet

# Subset
bun run --filter @expo-targets/ios-harness test:share-sheet
# or:
bun packages/expo-targets-ios-harness/src/cli.ts test examples/share examples/action
```

Env:

| Var                 | Role                                                            |
| ------------------- | --------------------------------------------------------------- |
| `UITEST_SIM_UDID`   | Override pinned simulator (default is machine-local iPhone Air) |
| `UITEST_*_OVERRIDE` | Override matrix env keys for attach/test                        |

## Flow

1. `npx expo prebuild --platform ios` (and Release install) for the example
2. `attach` copies `fixtures/ShareSheetSmoke.swift`, ensures `ExpoTargetsShareSheetUITests`, wires host `.xcscheme` Test action (Release + `UITEST_*`)
3. `test` / `test:share-sheet` takes a UDID file lock, attaches if needed, runs `xcodebuild test` serially; fail-fast on first failure (full log under `.ios-harness/`)

`prebuild --clean` may wipe the UITest target — re-attach.

## Failure gates

Do not silently downgrade to in-process-only or Maestro Share Sheet. On C1 fail → re-grill.
