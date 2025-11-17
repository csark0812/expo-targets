# Example Apps

This directory contains example applications demonstrating `expo-targets` features, organized by theme and workflow type.

## Quick Start

To run any example:

```bash
cd apps/<example-name>
bun install
npx expo prebuild  # For managed workflow
# OR
npx expo-targets sync  # For bare RN workflow (see app README)
npx expo run:ios
```

---

## 📱 Example Apps Overview

### 🎯 Thematic Examples

#### 1. **widgets-showcase** - Widget Examples

**Workflow:** Managed (Expo)
**Target Types:** Widget
**Complexity:** Basic → Advanced

Demonstrates three widget implementations:

- **Hello Widget**: Basic widget with simple data sharing
- **Counter Widget**: Interactive counter with increment/decrement
- **Weather Widget**: Advanced timeline-based weather widget with multiple sizes

**Best for:** Learning widget development patterns

---

#### 2. **extensions-showcase** - React Native Extensions

**Workflow:** Managed (Expo)
**Target Types:** Share Extension, Action Extension
**Complexity:** Intermediate

React Native-based extensions with custom UI:

- **Share Extension**: Share content from other apps with RN UI
- **Action Extension**: Process images with RN UI

**Best for:** Building extensions with React Native UI

---

#### 3. **native-extensions-showcase** - Native Swift Extensions

**Workflow:** Managed (Expo)
**Target Types:** Share Extension, Action Extension, App Clip
**Complexity:** Advanced

Native Swift/SwiftUI implementations with function-based configs:

- **Native Share**: Swift share extension
- **Native Action**: Swift action extension
- **Native Clip**: SwiftUI App Clip

**Features:**

- Function-based config files (`.ts`/`.js`)
- Pure native implementations
- Production-ready patterns

**Best for:** Learning native extension development

---

#### 4. **clips-and-stickers** - App Clips & iMessage

**Workflow:** Managed (Expo)
**Target Types:** App Clip, iMessage Stickers
**Complexity:** Intermediate

Combined examples:

- **Quick Checkout Clip**: App Clip with data sharing
- **Fun Stickers**: iMessage sticker pack

**Best for:** App Clips and iMessage extensions

---

### 🔧 Workflow Examples

#### 5. **bare-rn-widgets** - Bare React Native Widget

**Workflow:** Bare React Native
**Target Type:** Widget
**Complexity:** Intermediate

Demonstrates adding a widget to an existing bare RN project:

- Uses `expo-targets sync` instead of `expo prebuild`
- Manual Xcode project management
- Widget with data sharing

**Best for:** Integrating widgets into existing bare RN apps

---

#### 6. **bare-rn-share** - Bare React Native Share Extension

**Workflow:** Bare React Native
**Target Type:** Share Extension
**Complexity:** Advanced

Share extension in bare RN workflow:

- React Native UI in extension
- Metro configuration for extensions
- Release mode requirements

**Best for:** Adding share extensions to bare RN apps

---

### 🎪 Comprehensive Examples

#### 7. **all-targets-demo** - Kitchen Sink

**Workflow:** Managed (Expo)
**Target Types:** All 10 types
**Complexity:** Reference

Complete example demonstrating all target types:

- **Production-ready**: Widget, Clip, Share, Action, Stickers
- **Config-only**: Safari, Notification Content/Service, Intent, Intent UI

**Best for:** Reference implementation, understanding all target types

---

## 🎯 Feature Comparison

| App                            | Workflow | Target Types        | UI Type      | Config Type        | Data Sharing |
| ------------------------------ | -------- | ------------------- | ------------ | ------------------ | ------------ |
| **widgets-showcase**           | Managed  | Widget              | Native Swift | JSON               | ✅           |
| **extensions-showcase**        | Managed  | Share, Action       | React Native | JSON               | ✅           |
| **native-extensions-showcase** | Managed  | Share, Action, Clip | Native Swift | Function (.ts/.js) | ✅           |
| **clips-and-stickers**         | Managed  | Clip, Stickers      | Native Swift | JSON               | ✅           |
| **bare-rn-widgets**            | Bare RN  | Widget              | Native Swift | JSON               | ✅           |
| **bare-rn-share**              | Bare RN  | Share               | React Native | JSON               | ✅           |
| **all-targets-demo**           | Managed  | All 10 types        | Mixed        | JSON               | ✅           |

---

## 📚 Learning Path

### 🟢 Beginner - Start Here

**1. widgets-showcase** → **Hello Widget**

- Basic widget setup
- Data sharing fundamentals
- Widget refresh mechanism

**Key concepts:**

- `createTarget()` API
- `setData()` / `getData()`
- Widget refresh
- App Groups

---

### 🟡 Intermediate - Build Extensions

**2. extensions-showcase** → **Share Extension**

- React Native extension UI
- Content type handling
- Extension lifecycle

**3. clips-and-stickers** → **Quick Checkout Clip**

- App Clip URL handling
- Native SwiftUI in extensions
- Data synchronization

**Key concepts:**

- Extension entry points
- Metro configuration
- Native-Swift communication
- Extension constraints

---

### 🟠 Advanced - Native Development

**4. native-extensions-showcase** → **Native Share**

- Pure Swift implementations
- Function-based configs
- Advanced SwiftUI patterns

**5. bare-rn-widgets** → **Bare RN Integration**

- Existing project integration
- `expo-targets sync` workflow
- Manual Xcode setup

**Key concepts:**

- Native-only extensions
- Config file functions
- Bare workflow differences
- Release mode requirements

---

### 🔴 Expert - Production Patterns

**6. all-targets-demo** → **Complete Reference**

- All target types
- Production patterns
- Config-only targets

**7. bare-rn-share** → **Bare RN Extensions**

- React Native in extensions
- Metro bundling
- Extension memory limits

**Key concepts:**

- Multi-target architecture
- Extension best practices
- Performance optimization
- Production deployment

---

## 🔄 Workflow Comparison

### Managed Workflow (Expo)

**Apps:** `widgets-showcase`, `extensions-showcase`, `native-extensions-showcase`, `clips-and-stickers`, `all-targets-demo`

**Setup:**

```bash
cd apps/<app-name>
bun install
npx expo prebuild
npx expo run:ios
```

**Characteristics:**

- ✅ `ios/` directory auto-generated
- ✅ Full project regeneration
- ✅ Works out of the box
- ✅ Metro auto-configured

---

### Bare React Native Workflow

**Apps:** `bare-rn-widgets`, `bare-rn-share`

**Setup:**

```bash
cd apps/<app-name>
bun install
npx expo-targets sync  # Adds targets to existing Xcode project
cd ios && pod install
# Build in Xcode (Release mode for RN extensions)
```

**Characteristics:**

- ✅ Incremental target addition
- ✅ Manual Xcode project management
- ✅ Existing project integration
- ⚠️ Requires Metro config for RN extensions
- ⚠️ Release mode required for RN extensions

**See each app's README for detailed setup instructions.**

---

## 🎨 Configuration Patterns

### JSON Config

```json
// expo-target.config.json
{
  "type": "widget",
  "name": "MyWidget",
  "platforms": ["ios"],
  "appGroup": "group.com.example.app"
}
```

**Used in:** Most examples

---

### Function-Based Config (TypeScript)

```typescript
// expo-target.config.ts
import type { ExpoConfig, TargetConfig } from 'expo-targets/plugin';

export default function (config: ExpoConfig): TargetConfig {
  const bundleId = config.ios?.bundleIdentifier || 'com.example.app';

  return {
    type: 'share',
    name: 'MyShare',
    platforms: ['ios'],
    appGroup: `group.${bundleId}`,
    ios: {
      bundleIdentifier: `${bundleId}.share`,
    },
  };
}
```

**Used in:** `native-extensions-showcase`

**Benefits:**

- Dynamic configuration
- Access to Expo config
- Type safety
- Similar to `app.config.js`

---

## 🏗️ Architecture Patterns

### Single Target

```
app/
  App.tsx
  targets/
    my-widget/
      expo-target.config.json
      index.ts              # createTarget + helpers
      ios/
        Widget.swift        # Swift implementation
```

### Multiple Targets (Shared Data)

```
app/
  App.tsx
  targets/
    widget/
      expo-target.config.json
      index.ts
      ios/Widget.swift
    clip/
      expo-target.config.json
      index.ts
      ios/ClipView.swift
```

### React Native Extension

```
app/
  App.tsx
  metro.config.js           # Required for RN extensions
  targets/
    share-extension/
      expo-target.config.json
      index.tsx             # Entry point (registers RN component)
      src/
        ShareExtension.tsx  # React Native UI
```

---

## 🚀 Quick Reference

### Data Sharing

```typescript
import { createTarget } from 'expo-targets';

const myWidget = createTarget('MyWidget');

// Set data
myWidget.setData({ message: 'Hello' });

// Get data
const data = myWidget.getData<{ message: string }>();

// Refresh widget
myWidget.refresh();
```

### Widget Refresh

```typescript
// After updating data
myWidget.setData({ count: 5 });
myWidget.refresh(); // Updates widget immediately
```

### Extension Close

```typescript
import { createTarget } from 'expo-targets';

const shareTarget = createTarget<'share'>('ShareExtension', ShareComponent);

// In extension component
shareTarget.close(); // Closes extension
```

---

## 📖 Additional Resources

- [Getting Started Guide](../docs/getting-started.md)
- [API Reference](../docs/api-reference.md)
- [Configuration Reference](../docs/config-reference.md)
- [Architecture Overview](../docs/ARCHITECTURE.md)

---

## 🤝 Contributing

Have an interesting example? Submit a PR with:

- Complete working app
- Clear README
- Unique demonstration of features
- Production-quality code
- Appropriate workflow type (managed vs bare RN)

---

## 📝 License

MIT License - see [LICENSE](../LICENSE) for details
