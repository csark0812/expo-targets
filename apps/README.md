# Example Apps

Working examples for every extension type. Clone the repo and explore!

## Quick Start

```bash
cd apps/widgets-showcase
npm install
npx expo prebuild --clean
npx expo run:ios
```

---

## 🟢 Start Here: Widgets

### [widgets-showcase](./widgets-showcase)

Three widget examples from basic to advanced:

- **Hello Widget** — Simple data sharing between app and widget
- **Counter Widget** — Increment/decrement from app, see updates in widget
- **Weather Widget** — Timeline-based updates, multiple widget sizes

**Best for:** Learning widget fundamentals, understanding App Groups, SwiftUI basics

---

## 📱 React Native Extensions

### [extensions-showcase](./extensions-showcase)

React Native UI in extensions:

- **Share Extension** — Share content from other apps with custom RN UI
- **Action Extension** — Process images with custom UI
- **Messages App** — iMessage extension with React Native

**Best for:** Building extensions with React Native instead of native code

---

### [native-extensions-showcase](./native-extensions-showcase)

Pure Swift/SwiftUI extensions (no React Native):

- **Native Share** — Swift share extension
- **Native Action** — Swift action extension
- **Native Clip** — SwiftUI App Clip

**Best for:** Native extension development, learning the Swift side

---

## 🎪 App Clips & iMessage

### [clips-and-stickers](./clips-and-stickers)

- **Quick Checkout** — App Clip with data sharing to main app
- **Fun Stickers** — iMessage sticker pack with custom assets

**Best for:** App Clips, iMessage sticker packs

---

## 🔧 Bare React Native Workflow

### [bare-rn-widgets](./bare-rn-widgets)

Adding widgets to an existing bare React Native project using `expo-targets sync` instead of `expo prebuild`.

### [bare-rn-share](./bare-rn-share)

Share extension with React Native UI in bare workflow.

**Best for:** Integrating expo-targets into existing RN projects where you can't use `expo prebuild`

---

## 🎯 All Target Types

### [all-targets-demo](./all-targets-demo)

Complete reference with all supported target types:

- Widget, App Clip, Share, Action, Messages
- Stickers, Safari, Notifications, Intents

**Best for:** Reference implementation, seeing all types in one project

---

## Quick Reference

| Example                    | Extension Types         | UI           | Workflow |
| -------------------------- | ----------------------- | ------------ | -------- |
| widgets-showcase           | Widget                  | SwiftUI      | Managed  |
| extensions-showcase        | Share, Action, Messages | React Native | Managed  |
| native-extensions-showcase | Share, Action, Clip     | Swift        | Managed  |
| clips-and-stickers         | Clip, Stickers          | Swift        | Managed  |
| bare-rn-widgets            | Widget                  | SwiftUI      | Bare RN  |
| bare-rn-share              | Share                   | React Native | Bare RN  |
| all-targets-demo           | All types               | Mixed        | Managed  |

---

## Running Examples

### Managed Workflow (most examples)

```bash
cd apps/<example>
npm install
npx expo prebuild --clean
npx expo run:ios
```

### Bare React Native Workflow

```bash
cd apps/<example>
npm install
npx expo-targets sync
cd ios && pod install && cd ..
npx react-native run-ios
```

### Building for Release

For React Native extensions, test in Release mode to catch memory issues:

```bash
npx expo run:ios --configuration Release
```

---

## Troubleshooting Examples

**Example doesn't build?**

```bash
# Clean and rebuild
rm -rf ios android node_modules
npm install
npx expo prebuild --clean
npx expo run:ios
```

**Widget doesn't appear?**

1. Build succeeded but widget not in picker?
2. Long press home screen → tap **+** → search for the app name
3. If not found: Product → Clean Build Folder (⇧⌘K) → rebuild

**Extension crashes?**

1. Check Xcode console for error messages
2. Verify App Group IDs match in app.json and expo-target.config.json
3. Try Release build: `npx expo run:ios --configuration Release`

---

## Documentation Links

- [Getting Started](../docs/getting-started.md) — Build your first widget
- [Configuration](../docs/configuration.md) — All config options
- [API Reference](../docs/api.md) — JavaScript/TypeScript API
- [React Native Extensions](../docs/react-native-extensions.md) — RN in extensions
