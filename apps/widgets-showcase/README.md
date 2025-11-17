# Widgets Showcase

A comprehensive example app demonstrating different widget development patterns with expo-targets, from basic to advanced.

## Overview

This app showcases three widget examples at different complexity levels:

1. **Hello Widget** (Basic) - Simple message display widget
2. **Counter Widget** (Medium) - Count tracking with optional label
3. **Weather Widget** (Advanced) - Multi-size widget with timeline entries

## Quick Start

```bash
cd apps/widgets-showcase
bun install
npx expo prebuild -p ios --clean
npx expo run:ios
```

## Widget Examples

### 1. Hello Widget (Basic)

**Complexity:** ⭐ Basic
**Sizes:** Small only
**Features:**

- Simple message display
- Basic data sharing via App Groups
- Single widget size

**Use Case:** Learn the fundamentals of widget creation, data sharing, and widget refresh.

**Files:**

- `targets/hello-widget/expo-target.config.json` - Widget configuration
- `targets/hello-widget/index.ts` - Runtime API
- `targets/hello-widget/ios/Widget.swift` - Swift implementation

**Key Concepts:**

- Basic `TimelineProvider` implementation
- Simple `StaticConfiguration`
- App Group data sharing
- Widget refresh mechanism

### 2. Counter Widget (Medium)

**Complexity:** ⭐⭐ Medium
**Sizes:** Small, Medium
**Features:**

- Count display with optional label
- Multiple widget sizes (small & medium)
- Size-specific layouts using `@Environment(\.widgetFamily)`
- Type-safe data operations

**Use Case:** Learn how to support multiple widget sizes and create size-appropriate layouts.

**Files:**

- `targets/counter-widget/expo-target.config.json` - Widget configuration
- `targets/counter-widget/index.ts` - Runtime API with helper functions
- `targets/counter-widget/ios/Widget.swift` - Swift implementation with size handling

**Key Concepts:**

- Multiple widget families (`systemSmall`, `systemMedium`)
- Conditional rendering based on widget family
- JSON encoding/decoding for complex data
- Increment/decrement operations

### 3. Weather Widget (Advanced)

**Complexity:** ⭐⭐⭐ Advanced
**Sizes:** Small, Medium, Large
**Features:**

- Timeline entries for scheduled updates
- Multiple widget sizes with different layouts
- Dynamic color schemes based on weather condition
- Complex data structure (temperature, humidity, wind, location)
- 5-day forecast in large size
- Auto-refresh capability

**Use Case:** Learn advanced patterns including timeline entries, complex layouts, and multi-size widgets.

**Files:**

- `targets/weather-widget/expo-target.config.json` - Widget configuration with colors
- `targets/weather-widget/index.ts` - Runtime API
- `targets/weather-widget/ios/Widget.swift` - Main widget entry point
- `targets/weather-widget/ios/WeatherWidgetView.swift` - View router
- `targets/weather-widget/ios/SmallWidgetView.swift` - Small size view
- `targets/weather-widget/ios/MediumWidgetView.swift` - Medium size view
- `targets/weather-widget/ios/LargeWidgetView.swift` - Large size view with forecast

**Key Concepts:**

- Timeline entries for future updates
- Multiple Swift files for organization
- Size-specific view components
- Dynamic backgrounds with gradients
- Complex data serialization

## Widget Size Comparison

| Size   | Hello Widget | Counter Widget | Weather Widget       |
| ------ | ------------ | -------------- | -------------------- |
| Small  | ✅ Message   | ✅ Count       | ✅ Temp & condition  |
| Medium | ❌           | ✅ Count+Label | ✅ + Humidity & wind |
| Large  | ❌           | ❌             | ✅ + 5-day forecast  |

## Learning Path

### Step 1: Start with Hello Widget

1. Open the app and select "Hello Widget"
2. Enter a message and tap "Update Hello Widget"
3. Add the widget to your home screen (Small size)
4. Observe how the widget updates immediately

**What you'll learn:**

- Basic widget configuration
- App Group setup
- Simple data sharing
- Widget refresh mechanism

### Step 2: Try Counter Widget

1. Select "Counter Widget"
2. Increment/decrement the counter
3. Add an optional label
4. Add both Small and Medium sizes to home screen
5. Compare how different sizes display content

**What you'll learn:**

- Multiple widget sizes
- Size-specific layouts
- JSON data serialization
- Conditional rendering

### Step 3: Explore Weather Widget

1. Select "Weather Widget"
2. Change locations and observe updates
3. Enable auto-update to see timeline behavior
4. Add all three sizes (Small, Medium, Large) to home screen
5. Observe timeline entries in the Large widget

**What you'll learn:**

- Timeline entries and scheduling
- Complex multi-file widget structure
- Dynamic colors and gradients
- Advanced data structures

## Architecture Patterns

### Data Sharing

All widgets use App Groups for data sharing:

```typescript
// Configuration
"appGroup": "group.com.test.widgetshowcase"

// Swift code
let appGroup = "group.com.test.widgetshowcase"
let defaults = UserDefaults(suiteName: appGroup)
```

### Widget Refresh

Refresh widgets after data updates:

```typescript
helloWidget.set('message', 'Hello!');
helloWidget.refresh(); // Updates widget immediately
```

### Multiple Sizes

Handle different sizes in SwiftUI:

```swift
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
```

### Timeline Entries

Generate timeline for scheduled updates:

```swift
func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    var entries: [Entry] = []

    // Create entries for next 24 hours
    for hourOffset in 0..<24 {
        let date = Calendar.current.date(byAdding: .hour, value: hourOffset, to: Date())!
        entries.append(Entry(date: date, data: loadData()))
    }

    let timeline = Timeline(entries: entries, policy: .after(nextUpdate))
    completion(timeline)
}
```

## Key Differences

### Basic vs Medium vs Advanced

| Feature              | Basic (Hello) | Medium (Counter)  | Advanced (Weather) |
| -------------------- | ------------- | ----------------- | ------------------ |
| Widget Sizes         | 1 (Small)     | 2 (Small, Medium) | 3 (All sizes)      |
| Data Complexity      | Simple string | JSON object       | Complex structure  |
| Timeline Entries     | ❌            | ❌                | ✅                 |
| Multiple Swift Files | ❌            | ❌                | ✅                 |
| Dynamic Colors       | ❌            | ❌                | ✅                 |
| Conditional Layouts  | ❌            | ✅                | ✅                 |

## Code Structure

```
widgets-showcase/
├── targets/
│   ├── hello-widget/          # Basic example
│   │   ├── expo-target.config.json
│   │   ├── index.ts
│   │   └── ios/
│   │       └── Widget.swift
│   │
│   ├── counter-widget/        # Medium example
│   │   ├── expo-target.config.json
│   │   ├── index.ts
│   │   └── ios/
│   │       └── Widget.swift
│   │
│   └── weather-widget/        # Advanced example
│       ├── expo-target.config.json
│       ├── index.ts
│       └── ios/
│           ├── Widget.swift
│           ├── WeatherWidgetView.swift
│           ├── SmallWidgetView.swift
│           ├── MediumWidgetView.swift
│           └── LargeWidgetView.swift
│
├── App.tsx                     # Main app UI
├── app.json                    # Expo configuration
└── package.json
```

## Common Patterns

### Type-Safe Data

```typescript
export interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  humidity: number;
  windSpeed: number;
  lastUpdated: string;
}

export const updateWeather = async (data: WeatherData) => {
  weatherWidget.set('weather', JSON.stringify(data));
  weatherWidget.refresh();
};
```

### Helper Functions

```typescript
export const incrementCounter = () => {
  const data = counterWidget.getData<CounterData>() || { count: 0 };
  updateCounter((data.count || 0) + 1, data.label);
};
```

### Swift Data Loading

```swift
private func loadWeatherData() -> WeatherData? {
    guard let defaults = UserDefaults(suiteName: appGroup),
          let jsonString = defaults.string(forKey: "weather"),
          let jsonData = jsonString.data(using: .utf8) else {
        return nil
    }
    return try? JSONDecoder().decode(WeatherData.self, from: jsonData)
}
```

## Troubleshooting

### Widget not appearing?

1. Run `npx expo prebuild -p ios --clean`
2. Check Xcode project for widget targets
3. Verify `Info.plist` exists in target directories
4. Clean build folder in Xcode (Cmd+Shift+K)

### Widget not updating?

1. Verify App Group IDs match exactly:
   - `app.json` entitlements
   - `expo-target.config.json` appGroup
   - Swift code `UserDefaults(suiteName:)`
2. Call `widget.refresh()` after setting data
3. Test on physical device (simulators cache aggressively)

### Multiple widgets not working?

- Each widget needs a unique `name` in config
- Each widget needs a unique bundle identifier
- Verify all widgets use the same App Group

## Next Steps

After exploring this showcase:

1. **Modify examples** - Try changing colors, layouts, or data structures
2. **Create your own** - Use these patterns to build your own widgets
3. **Explore other targets** - Check out `extensions-showcase` for share/action extensions
4. **Bare RN workflow** - See `bare-rn-widgets` for bare React Native examples

## Resources

- [Main Documentation](../../docs/getting-started.md)
- [API Reference](../../docs/api-reference.md)
- [Config Reference](../../docs/config-reference.md)
- [Other Examples](../README.md)
