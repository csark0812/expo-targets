# @expo-targets/ios-harness

**Local / MCP only.** Private XCUITest orchestration for expo-targets examples. Not a Ubuntu CI merge gate. **Release** simulator builds required.

## Package boundary

Hosts **Share Sheet** + **MobileSMS** (Messages / Stickers) only. Other OS hosts (SpringBoard widgets, Wallet, Clip-via-XCUITest) need an **explicit fork decision** — do not treat suite generalization as an all-types platform.

| Surface | Harness | Proof bar |
|---------|---------|-----------|
| Share / action (RN + native) | XCUITest Share Sheet | App Group via Share Sheet |
| Messages | XCUITest MobileSMS | `ag-handoff` (Send → host payload) |
| Stickers | XCUITest MobileSMS | `pack-interact` (visible + tappable; **no** App Group) |
| Clip | Maestro `launch.yaml` | URL → host handoff |
| Widgets | Deferred | Soft-deprecated → `expo-widgets` |

## Commands

```bash
# Share Sheet matrix (C1)
bun run --filter @expo-targets/ios-harness test:share-sheet

# Messages (ag-handoff) / Stickers (pack-interact)
bun run --filter @expo-targets/ios-harness test:messages
bun run --filter @expo-targets/ios-harness test:stickers

# Serial MobileSMS runner alias (orchestration only — asymmetric bars)
bun run --filter @expo-targets/ios-harness test:imessage-surface

bun run --filter @expo-targets/ios-harness attach -- examples/messages
bun run --filter @expo-targets/ios-harness test:unit
```

Env: `UITEST_SIM_UDID`, `UITEST_*_OVERRIDE`. Hard PID lock: `os.tmpdir()/expo-targets-ios-harness-<udid>.lock`.

MobileSMS flake class ≠ Share Sheet — prefer **2×** green on the pinned sim.

## Attach

Post-prebuild, idempotent. Suite config picks UITest target name + fixture (`ExpoTargetsShareSheetUITests` / `ExpoTargetsMessagesUITests` / `ExpoTargetsStickersUITests`).

## Failure gates

Do not silently downgrade to in-process-only or Maestro Share Sheet. On fail → re-grill.

## Roadmap (not this package yet)

- Custom sticker browser + App Group (`MSStickerBrowserViewController`)
- Widgets SpringBoard gallery XCUITest (fork decision)
