# Example Apps

This directory contains example applications demonstrating different target types and complex behaviors with expo-targets.

## Quick Start

To run any example:

```bash
cd apps/<example-name>
bun install
npx expo prebuild
npx expo run:ios
```

---

## 📱 Example Apps

### 1. widget-basic (Original)

**Target Type:** Widget
**Complexity:** Basic

Simple widget demonstrating core functionality:

- Basic widget with data sharing
- Type-safe data operations
- Color assets
- Widget refresh from main app

**Features:**

- Small, medium, and large widget sizes
- App Group communication
- Real-time updates

**Use Case:** First-time widget setup

---

### 2. clip-advanced

**Target Type:** App Clip
**Complexity:** Advanced

Advanced App Clip with invocation URL handling:

- URL parameter parsing
- Location-based features
- NFC/QR code launching
- Seamless full app upgrade

**Features:**

- Invocation URL handling
- Location permissions demo
- Deep linking
- Lightweight experience

**Use Case:** Quick checkout, event check-in, restaurant menus

**Try It:**

1. Launch via URL scheme with parameters
2. Scan NFC tag or QR code
3. Grant location permissions
4. Upgrade to full app

---

### 3. imessage-stickers

**Target Type:** iMessage Extension
**Complexity:** Intermediate

iMessage sticker pack with multiple categories:

- Static sticker support
- Multiple sticker packs
- Sticker usage tracking
- Stats in main app

**Features:**

- Multiple sticker categories (Emojis, Animals, Food, Activities)
- iMessage keyboard integration
- Asset catalog structure
- Usage analytics

**Use Case:** Custom stickers, branded messaging, creative expression

**Try It:**

1. Open iMessage
2. Tap App Store icon
3. Select sticker pack
4. Send stickers

---

### 4. share-extension

**Target Type:** Share Extension
**Complexity:** Advanced

Share extension for capturing content from other apps:

- Text, URL, and image sharing
- Content processing
- Shared item history
- Multi-type support

**Features:**

- Handle text content
- Process URLs
- Image metadata extraction
- App Group storage
- History view in main app

**Use Case:** Bookmarking, article saving, content collection

**Try It:**

1. Open Safari or Photos
2. Tap Share button
3. Select "Share Extension"
4. View shared items in main app

---

### 5. widget-interactive

**Target Type:** Widget
**Complexity:** Advanced

Interactive weather widget with timeline updates:

- Multiple widget sizes (small, medium, large)
- Timeline entries
- Dynamic color schemes
- Auto-refresh

**Features:**

- Small: Temperature & condition
- Medium: + Humidity & wind details
- Large: + 5-day forecast timeline
- Dynamic backgrounds based on weather
- Location switching
- Auto-update every 30s
- Timeline-based content

**Use Case:** Real-time data display, dashboard widgets

**Try It:**

1. Add widget to home screen (all sizes)
2. Change location in app
3. Watch auto-updates
4. Compare different widget sizes

---

### 6. multi-target

**Target Types:** Widget + App Clip
**Complexity:** Advanced

Task manager with multiple targets sharing data:

- Task widget showing active tasks
- Quick Task App Clip for fast entry
- Shared App Group storage
- Synchronized updates

**Features:**

- **Main App:** Full task management
- **Widget:** Quick glance at active tasks (small & medium)
- **App Clip:** Fast task creation
- Shared data across all targets
- Real-time synchronization

**Use Case:** Demonstrates multi-target architecture

**Try It:**

1. Add widget to home screen
2. Launch App Clip via URL
3. Add task from any target
4. See updates everywhere instantly

---

## 🎯 Feature Comparison

| App                | Target Type(s) | Data Sharing | Timeline | Multi-Size | Complex UI |
| ------------------ | -------------- | ------------ | -------- | ---------- | ---------- |
| widget-basic       | Widget         | ✅           | ❌       | ✅         | ❌         |
| clip-advanced      | Clip           | ✅           | ❌       | N/A        | ✅         |
| imessage-stickers  | iMessage       | ✅           | ❌       | N/A        | ⚠️         |
| share-extension    | Share          | ✅           | ❌       | N/A        | ✅         |
| widget-interactive | Widget         | ✅           | ✅       | ✅         | ✅         |
| multi-target       | Widget + Clip  | ✅           | ❌       | ✅         | ✅         |

---

## 📚 Learning Path

### Beginner

Start with **widget-basic** to understand:

- Basic target configuration
- Data sharing via App Groups
- Widget refresh mechanism

### Intermediate

Try **imessage-stickers** or **clip-advanced** to learn:

- Different target types
- Platform-specific features
- URL handling

### Advanced

Explore **widget-interactive** and **share-extension** for:

- Timeline entries
- Complex data processing
- Multiple widget sizes
- Extension UI design

### Expert

Build with **multi-target** to master:

- Multiple targets in one app
- Shared data architecture
- Cross-target communication
- Production patterns

---

## 🏗️ Architecture Patterns

### Single Target

```
app/
  App.tsx              # Main app
  targets/
    my-widget/
      index.ts         # defineTarget + data helpers
      ios/
        Widget.swift   # Widget implementation
```

### Multiple Targets (Shared Data)

```
app/
  App.tsx
  targets/
    shared.ts          # Shared data functions
    widget/
      index.ts         # Re-exports shared
      ios/
        Widget.swift
    clip/
      index.ts         # Re-exports shared
      ios/
        ClipView.swift
```

---

## 🎨 Design Patterns

### Data Sharing

All examples use App Groups for secure data sharing:

```typescript
export const myTarget = defineTarget({
  type: 'widget',
  name: 'MyWidget',
  appGroup: 'group.com.example.app',
  // ...
});

// Store data
await myTarget.setData('key', { value: 'data' });

// Retrieve data
const data = await myTarget.getData('key');
```

### Widget Refresh

Refresh widgets after data changes:

```typescript
await myTarget.set('counter', count.toString());
await myTarget.refresh(); // Updates widget
```

### Multiple Sizes

Handle different widget families in SwiftUI:

```swift
struct MyWidgetView: View {
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallView()
        case .systemMedium:
            MediumView()
        case .systemLarge:
            LargeView()
        default:
            SmallView()
        }
    }
}
```

### Timeline Entries

Generate timeline for periodic updates:

```swift
func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    var entries: [Entry] = []

    // Create entries for next 24 hours
    for hourOffset in 0..<24 {
        let date = Calendar.current.date(byAdding: .hour, value: hourOffset, to: Date())!
        let entry = Entry(date: date, data: loadData())
        entries.append(entry)
    }

    let timeline = Timeline(entries: entries, policy: .atEnd)
    completion(timeline)
}
```

---

## 🚀 Production Checklist

Before shipping:

- [ ] Test all widget sizes
- [ ] Verify App Group entitlements
- [ ] Test data synchronization
- [ ] Check memory usage
- [ ] Optimize Swift view performance
- [ ] Add error handling
- [ ] Test on multiple iOS versions
- [ ] Verify dark mode support
- [ ] Test background updates
- [ ] Profile widget timeline

---

## 🐛 Troubleshooting

### Widget not showing data

1. Check App Group identifier matches everywhere
2. Verify entitlements in app.json
3. Run `npx expo prebuild --clean`
4. Check UserDefaults suite name

### App Clip not launching

1. Verify associated domains entitlement
2. Check URL format
3. Ensure parent app identifier is correct
4. Test with App Clip testing tools

### iMessage stickers not appearing

1. Verify sticker assets exist
2. Check Info.plist configuration
3. Ensure proper extension point identifier
4. Rebuild project

### Share extension crashes

1. Check memory limits (extensions have strict limits)
2. Verify content type handling
3. Add error handling for malformed data
4. Test with various content types

---

## 📖 Additional Resources

- [Main Documentation](../docs/getting-started.md)
- [API Reference](../docs/api-reference.md)
- [Configuration Guide](../docs/config-reference.md)
- [TypeScript Guide](../docs/typescript-config-guide.md)

---

## 🤝 Contributing

Have an interesting example? Submit a PR with:

- Complete working app
- Clear documentation
- Unique demonstration of features
- Production-quality code

---

## 📝 License

MIT License - see [LICENSE](../LICENSE) for details
