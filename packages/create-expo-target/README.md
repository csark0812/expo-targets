# create-expo-target

CLI tool for scaffolding expo-targets extensions.

> **Part of the expo-targets monorepo**. See the [main README](../../README.md) for complete documentation.

## Usage

```bash
npx create-expo-target
```

## What It Does

Interactive CLI that creates:

1. **Target directory**: `targets/{name}/`
2. **Configuration file**: `expo-target.config.json` (+ host `index.ts` / RN `index.tsx` when applicable)
3. **Swift template**: type-specific or generic handler stub under `ios/`
4. **Asset directories**: For iMessage stickers (`imessage` menu → config `type: "stickers"`)

## Interactive prompts (menu)

- Share / Action / App Clip / Messages
- iMessage Stickers (writes `type: "stickers"`, not `imessage`)
- Wallet / Siri Intent / Widget (soft-deprecated → expo-widgets)
- Notification Service / Content, Safari, Content Blocker, App Intent
- Keyboard, Photo Editing, File Provider, Broadcast Upload, Call Directory, Credentials Provider

Additional Bacon-parity types are available via hand-written `expo-target.config.json` + examples under `examples/`. See [migrate-from-bacons-apple-targets.md](../../docs/migrate-from-bacons-apple-targets.md).

## Related

- [configuration.md](../../docs/configuration.md)
- [deprecations.md](../../docs/deprecations.md)
