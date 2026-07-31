# UITest harness (moved)

Share Sheet XCUITest attach + serial run lives in **`@expo-targets/ios-harness`**:

```bash
# After prebuild + Release install of an example:
bun run --filter @expo-targets/ios-harness attach -- examples/share
bun run test:share-sheet
```

See [`packages/expo-targets-ios-harness/README.md`](../../../packages/expo-targets-ios-harness/README.md).

## Failure gates (unchanged)

| Spike                       | Gate                                                              | On failure                                                                |
| --------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **C1** XCUITest Share Sheet | Sheet interactable; extension complete → host `text-last-payload` | **Stop and re-grill.** No in-process-only / Maestro Share Sheet fallback. |
| **C2** Maestro clip launch  | `openLink` / simctl launches clip + host handoff                  | **Stop and re-grill.**                                                    |
| **Post-C Messages**         | MobileSMS → Send template → host App Group marker                 | **Stop and re-grill.**                                                    |
| **Post-C Stickers**         | MobileSMS → Fun Stickers visible + tappable (no App Group)        | **Stop and re-grill.**                                                    |

```bash
bun run test:messages
bun run test:stickers
# serial runner alias (asymmetric bars — not one proof class):
bun run test:imessage-surface
```

Clip Maestro flows remain under each example’s `.maestro/launch.yaml`.
