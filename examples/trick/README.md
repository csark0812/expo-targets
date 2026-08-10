# Trick

Live Activity and deepened Apple extension showcase. The host lists capability cards (NSE, NCE, photo editing, Files, keyboard, Safari, blocker, share, action, messages, widgets). Buttons schedule NCE notifications, register a Files domain, and start/update/end a Live Activity.

Widget and Live Activity docs: [../../docs/widgets.md](../../docs/widgets.md). Suite how-to: [../README.md](../README.md). Type maturity: [../../docs/configuration.md](../../docs/configuration.md).

```bash
npm install
npx expo prebuild --platform ios
npx expo run:ios
```

From the monorepo root, run `bun install` once before `npm install` in this folder.

Devicewright (operator, after Release install on a booted sim):

```bash
bun run examples:devicewright:matrix --ids=live-activity
```

Do not commit generated `ios/`. Never edit `ExpoTargetsGenerated/`.
