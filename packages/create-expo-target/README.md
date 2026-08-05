# create-expo-target

CLI tool for scaffolding expo-targets extensions.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-05 -->

> **Part of the expo-targets monorepo**. See the [main README](../../README.md) and [getting-started](../../docs/getting-started.md). **Tested on Expo SDK 57.** Contributors: [CONTRIBUTING.md](../../CONTRIBUTING.md).

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
- Wallet / Siri Intent / Widget (native WidgetKit + Live Activities)
- Notification Service / Content, Safari, Content Blocker, App Intent
- Keyboard, Photo Editing, File Provider, Broadcast Upload, Call Directory, Credentials Provider

Additional types are available via hand-written `expo-target.config.json` + examples under `examples/`. See [configuration.md](../../docs/configuration.md).

## Related

- [configuration.md](../../docs/configuration.md)
- [deprecations.md](../../docs/deprecations.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
