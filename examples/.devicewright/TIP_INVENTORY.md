# Tip inventory (Phase 2 gate — port before tip branch delete)

Local tip branches in **expo-targets** that held host UI / XCUITest flows.

| Tip branch | Useful artifacts | Ported into |
|------------|------------------|-------------|
| `feat/ios-harness-package` | share/action `btn-open-share-sheet` | public examples + this suite |
| `feat/ios-harness-imessage` | MessagesSmoke / StickersSmoke flows | `journeys/messages.ts`, `journeys/stickers.ts` |

## Port checklist

- [x] Share/action open-sheet host triggers → public examples (PR #44)
- [x] Messages/stickers/clip/widgets journeys → `examples/.devicewright/journeys/`
- [x] Stickers host catalog → PR #44
- [ ] Delete tip branches only after Phase 2 matrix green on Release installs

## Notes

- ios-harness stays in private device-plane until C1 green, then remove.
- Spike evidence: `artifacts/spikes/springboard-sheet.json`
