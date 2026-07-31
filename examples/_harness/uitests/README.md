# UITest harness (moved)

Share Sheet XCUITest attach + serial run lives in **`@expo-targets/ios-harness`**:

```bash
# After prebuild + Release install of an example:
bun run --filter @expo-targets/ios-harness attach -- examples/share
bun run test:share-sheet
```

See [`packages/expo-targets-ios-harness/README.md`](../../../packages/expo-targets-ios-harness/README.md).

## Failure gates (unchanged)

| Spike | Gate | On failure |
| --- | --- | --- |
| **C1** XCUITest Share Sheet | Sheet interactable; extension complete → host `text-last-payload` | **Stop and re-grill.** No in-process-only / Maestro Share Sheet fallback. |
| **C2** Maestro clip launch | `openLink` / simctl launches clip + host handoff | **Stop and re-grill.** |

Clip Maestro flows remain under each example’s `.maestro/launch.yaml`.
