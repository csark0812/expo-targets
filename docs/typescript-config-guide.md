# TypeScript Config Guide

Complete guide to using expo-targets with TypeScript for type-safe target configuration and runtime API.

## Overview

expo-targets uses a unified TypeScript approach where a single `index.ts` file:

1. **Defines configuration** for the build plugin (parsed at build time)
2. **Exports runtime instance** for your app to use
3. **Exports data types** for type-safe operations

This provides a clean, type-safe developer experience with full IDE support.

---

## File Structure

```
your-app/
├── targets/
│   ├── hello-widget/
│   │   ├── index.ts          ← Configuration + Runtime
│   │   └── ios/
│   │       └── Widget.swift
│   └── dashboard-widget/
│       ├── index.ts
│       └── ios/
│           └── Widget.swift
└── App.tsx                    # Imports from targets/
```

---

## Basic Setup

### 1. Create Target Definition

Create `targets/hello-widget/index.ts`:

```typescript
import { defineTarget } from 'expo-targets';

export const HelloWidget = defineTarget({
  // Configuration (parsed by build plugin)
  name: 'hello-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  displayName: 'Hello Widget',
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      colors: {
        $accent: '#007AFF',
        $background: { light: '#F2F2F7', dark: '#1C1C1E' },
      },
    },
  },
});

// Export data type for type-safe operations
export type HelloWidgetData = {
  message: string;
  count?: number;
  timestamp: number;
};
```

**What this does:**

- **Build time**: Plugin reads configuration from `defineTarget()` call
- **Runtime**: Exports `HelloWidget` instance with methods (`set`, `get`, `refresh`, etc.)
- **Type safety**: `HelloWidgetData` type for compile-time checks

### 2. Create Barrel Export (Recommended)

Create `targets/index.ts` for convenient imports:

```typescript
// Export all targets
export { HelloWidget } from './hello-widget';
export { DashboardWidget } from './dashboard-widget';
export { WeatherWidget } from './weather-widget';

// Export all data types
export type { HelloWidgetData } from './hello-widget';
export type { DashboardData } from './dashboard-widget';
export type { WeatherData } from './weather-widget';
```

Now you can import everything from one place:

```typescript
import { HelloWidget, DashboardWidget } from './targets';
import type { HelloWidgetData } from './targets';
```

---

## Usage in Your App

### Simple Key-Value Storage

```typescript
import { HelloWidget } from './targets';

function updateWidget() {
  // Store individual values
  HelloWidget.set('message', 'Hello World!');
  HelloWidget.set('count', 42);
  HelloWidget.set('user', { name: 'John', age: 30 });

  // Refresh widget UI
  HelloWidget.refresh();
}

function readWidget() {
  const message = HelloWidget.get('message');
  console.log(message); // "Hello World!" or null

  // Parse manually for complex types
  const userStr = HelloWidget.get('user');
  const user = userStr ? JSON.parse(userStr) : null;
}

function clearWidget() {
  HelloWidget.remove('message');
  HelloWidget.remove('count');
  HelloWidget.refresh();
}
```

### Type-Safe Data Objects

**Recommended approach** for complex data structures:

```typescript
import { HelloWidget } from './targets';
import type { HelloWidgetData } from './targets';

function updateWidget() {
  // Create type-safe data object
  const data: HelloWidgetData = {
    message: 'Hello Widget!',
    count: 42,
    timestamp: Date.now(),
  };

  // Store as single object (namespaced key: "hello-widget:data")
  HelloWidget.setData(data);
  HelloWidget.refresh();
}

function readWidget() {
  const data = HelloWidget.getData<HelloWidgetData>();

  if (data) {
    // TypeScript knows these properties exist
    console.log(data.message); // string
    console.log(data.count); // number | undefined
    console.log(data.timestamp); // number
  }
}
```

**Benefits:**

- ✅ Compile-time type checking
- ✅ IDE autocomplete
- ✅ Refactoring safety
- ✅ Single storage operation
- ✅ Automatic JSON serialization/deserialization

### Multiple Targets

```typescript
import { HelloWidget, DashboardWidget, WeatherWidget } from './targets';
import { refreshAllTargets } from 'expo-targets';

function updateAllWidgets() {
  // Update multiple widgets
  HelloWidget.set('message', 'Hello');
  DashboardWidget.setData({ revenue: 1000, users: 500 });
  WeatherWidget.setData({ temp: 72, condition: 'sunny' });

  // Refresh all at once (more efficient than individual refreshes)
  refreshAllTargets();
}
```

### Advanced: Direct Storage Access

For advanced use cases, access the underlying storage directly:

```typescript
import { HelloWidget } from './targets';

// Direct storage operations (bypasses type safety)
HelloWidget.storage.set('custom-key', 'value');
const value = HelloWidget.storage.get('custom-key');
```

---

## Complete Examples

### Basic Widget

```typescript
// targets/simple-widget/index.ts
import { defineTarget } from 'expo-targets';

export const SimpleWidget = defineTarget({
  name: 'simple-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  displayName: 'Simple Widget',
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      colors: {
        $accent: '#007AFF',
      },
    },
  },
});

export type SimpleWidgetData = {
  message: string;
};
```

### Dashboard Widget with Complex Data

```typescript
// targets/dashboard-widget/index.ts
import { defineTarget } from 'expo-targets';

export const DashboardWidget = defineTarget({
  name: 'dashboard-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  displayName: 'Dashboard',
  platforms: {
    ios: {
      deploymentTarget: '16.0',
      colors: {
        $primary: '#007AFF',
        $secondary: '#5856D6',
        $success: '#34C759',
        $warning: '#FF9500',
        $error: '#FF3B30',
        $background: {
          light: '#FFFFFF',
          dark: '#000000',
        },
        $cardBackground: {
          light: '#F2F2F7',
          dark: '#1C1C1E',
        },
      },
      images: {
        logo: './assets/logo.png',
        chartPlaceholder: './assets/chart-placeholder.png',
      },
    },
  },
});

export type DashboardData = {
  revenue: {
    current: number;
    previous: number;
    change: number; // percentage
  };
  users: {
    active: number;
    new: number;
    total: number;
  };
  metrics: {
    conversionRate: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
  lastUpdated: number; // timestamp
};
```

**Usage:**

```typescript
// App.tsx
import { DashboardWidget } from './targets/dashboard-widget';
import type { DashboardData } from './targets/dashboard-widget';

async function updateDashboard() {
  const stats = await fetchDashboardStats();

  const data: DashboardData = {
    revenue: {
      current: stats.revenue,
      previous: stats.previousRevenue,
      change:
        ((stats.revenue - stats.previousRevenue) / stats.previousRevenue) * 100,
    },
    users: {
      active: stats.activeUsers,
      new: stats.newUsers,
      total: stats.totalUsers,
    },
    metrics: {
      conversionRate: stats.conversionRate,
      avgSessionDuration: stats.avgSessionDuration,
      bounceRate: stats.bounceRate,
    },
    lastUpdated: Date.now(),
  };

  DashboardWidget.setData(data);
  DashboardWidget.refresh();
}
```

### Weather Widget with Location Data

```typescript
// targets/weather-widget/index.ts
import { defineTarget } from 'expo-targets';

export const WeatherWidget = defineTarget({
  name: 'weather-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  displayName: 'Weather',
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      frameworks: ['CoreLocation'], // Additional framework
      colors: {
        $sunny: '#FDB813',
        $cloudy: '#8E8E93',
        $rainy: '#007AFF',
        $snowy: '#48B9D4',
      },
    },
  },
});

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy';

export type WeatherData = {
  location: {
    city: string;
    country: string;
  };
  current: {
    temperature: number;
    feelsLike: number;
    condition: WeatherCondition;
    humidity: number;
  };
  forecast: Array<{
    day: string;
    high: number;
    low: number;
    condition: WeatherCondition;
  }>;
  lastUpdated: number;
};
```

### Share Extension with React Native

```typescript
// targets/share-extension/index.ts
import { defineTarget } from 'expo-targets';

export const ShareExtension = defineTarget({
  name: 'share-extension',
  appGroup: 'group.com.yourapp',
  type: 'share',
  displayName: 'Share to MyApp',
  platforms: {
    ios: {
      deploymentTarget: '13.0',
      useReactNative: true,
      excludedPackages: [
        'expo-updates',
        'expo-dev-client',
        '@react-native-async-storage/async-storage',
      ],
      colors: {
        $brand: '#FF6B6B',
        $background: {
          light: '#FFFFFF',
          dark: '#000000',
        },
      },
    },
  },
});

export type ShareData = {
  url: string;
  title?: string;
  text?: string;
  timestamp: number;
};
```

---

## Advanced Patterns

### Computed Configuration

Import constants and compute values at build time:

```typescript
import { defineTarget } from 'expo-targets';
import { BRAND_COLORS } from '@/constants/colors';
import { APP_CONFIG } from '@/config';

const isDev = process.env.NODE_ENV === 'development';

export const MyWidget = defineTarget({
  name: 'my-widget',
  appGroup: isDev ? APP_CONFIG.dev.appGroup : APP_CONFIG.prod.appGroup,
  type: 'widget',
  displayName: isDev ? 'My Widget (Dev)' : 'My Widget',
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      colors: BRAND_COLORS, // Imported from constants
    },
  },
});
```

### Shared Types Across App and Widget

Create shared type definitions:

```typescript
// types/widget-data.ts
export type WidgetData = {
  message: string;
  count: number;
  timestamp: number;
};

// targets/hello-widget/index.ts
import { defineTarget } from 'expo-targets';
import type { WidgetData } from '@/types/widget-data';

export const HelloWidget = defineTarget({
  name: 'hello-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  platforms: { ios: {} },
});

// Re-export for convenience
export type { WidgetData };

// App.tsx
import { HelloWidget } from './targets/hello-widget';
import type { WidgetData } from './targets/hello-widget';

const data: WidgetData = {
  message: 'Hello',
  count: 42,
  timestamp: Date.now(),
};

HelloWidget.setData(data);
```

### Environment-Specific Configuration

```typescript
import { defineTarget } from 'expo-targets';

const env = process.env.EXPO_PUBLIC_ENV || 'dev';

const APP_GROUPS = {
  dev: 'group.com.yourapp.dev',
  staging: 'group.com.yourapp.staging',
  prod: 'group.com.yourapp',
};

const DISPLAY_NAMES = {
  dev: 'Widget (Dev)',
  staging: 'Widget (Staging)',
  prod: 'Widget',
};

export const MyWidget = defineTarget({
  name: 'my-widget',
  appGroup: APP_GROUPS[env],
  type: 'widget',
  displayName: DISPLAY_NAMES[env],
  platforms: {
    ios: {
      colors: {
        $accent: env === 'dev' ? '#FF0000' : '#007AFF',
      },
    },
  },
});
```

### Multiple Widget Sizes with Shared Data

```typescript
// targets/weather-widget/index.ts
import { defineTarget } from 'expo-targets';

export const WeatherWidget = defineTarget({
  name: 'weather-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  displayName: 'Weather',
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      colors: {
        $sunny: '#FDB813',
        $cloudy: '#8E8E93',
      },
    },
  },
});

// Single data type for all sizes
export type WeatherData = {
  temperature: number;
  condition: string;
  // Small widget shows only temp & condition
  // Medium adds humidity, feels like
  humidity?: number;
  feelsLike?: number;
  // Large adds hourly forecast
  hourly?: Array<{
    time: string;
    temp: number;
    condition: string;
  }>;
};
```

**In Swift:**

```swift
// SmallWidgetView.swift - Shows basic data
struct SmallWidgetView: View {
    var data: WeatherData

    var body: some View {
        VStack {
            Text("\(data.temperature)°")
            Text(data.condition)
        }
    }
}

// MediumWidgetView.swift - Shows more details
struct MediumWidgetView: View {
    var data: WeatherData

    var body: some View {
        HStack {
            VStack {
                Text("\(data.temperature)°")
                Text(data.condition)
            }
            if let humidity = data.humidity {
                Text("Humidity: \(humidity)%")
            }
        }
    }
}
```

---

## API Reference Summary

### `defineTarget(options): Target`

Creates a target instance with configuration and runtime methods.

**Configuration properties:**

- `name`: Target identifier (required)
- `appGroup`: App Group for shared storage (required)
- `type`: Extension type (required)
- `displayName`: Human-readable name (optional)
- `platforms`: Platform-specific config (required)

**Returns Target instance with:**

- `set(key, value)`: Store value
- `get(key)`: Retrieve value
- `remove(key)`: Delete value
- `setData<T>(data)`: Store typed object
- `getData<T>()`: Retrieve typed object
- `refresh()`: Update widget UI
- `storage`: Direct storage access

---

## Best Practices

### 1. Use Type-Safe Data Objects

Prefer `setData()` / `getData()` for complex data:

```typescript
// ✅ Good: Type-safe
const data: WidgetData = { message: 'Hello', count: 42 };
Widget.setData(data);

// ❌ Avoid: Manual key-value for complex data
Widget.set('message', 'Hello');
Widget.set('count', 42);
```

### 2. Export Data Types

Always export types for external use:

```typescript
// ✅ Good: Exportable
export type WidgetData = {
  message: string;
};

// ❌ Avoid: Local-only type
type WidgetData = {
  message: string;
};
```

### 3. Create Barrel Exports

Organize targets in a single import point:

```typescript
// targets/index.ts
export { Widget1, Widget2, Widget3 } from './...';
export type { Data1, Data2, Data3 } from './...';

// App.tsx
import { Widget1, Widget2 } from './targets';
import type { Data1 } from './targets';
```

### 4. Use Semantic Color Names

```typescript
// ✅ Good: Semantic
colors: {
  $primary: '#007AFF',
  $success: '#34C759',
  $error: '#FF3B30',
}

// ❌ Avoid: Color-based
colors: {
  $blue: '#007AFF',
  $green: '#34C759',
  $red: '#FF3B30',
}
```

### 5. Document Complex Types

```typescript
export type DashboardData = {
  /** Current month revenue in USD */
  revenue: number;

  /** Active users in last 30 days */
  activeUsers: number;

  /** Unix timestamp of last update */
  lastUpdated: number;
};
```

---

## TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", "targets/**/*.ts"],
  "exclude": ["node_modules", "ios", "android"]
}
```

---

## Migration from Legacy API

### Before (Manual TargetStorage)

```typescript
// Old approach
import { TargetStorage } from 'expo-targets';

const storage = new TargetStorage('group.com.app', 'hello-widget');
storage.set('message', 'Hello');
storage.refresh();

const message = storage.get('message');
```

### After (defineTarget)

```typescript
// New approach
import { defineTarget } from 'expo-targets';

export const HelloWidget = defineTarget({
  name: 'hello-widget',
  appGroup: 'group.com.app',
  type: 'widget',
  platforms: { ios: {} },
});

// Usage
HelloWidget.set('message', 'Hello');
HelloWidget.refresh();

const message = HelloWidget.get('message');
```

**Benefits:**

- ✅ Single source of truth
- ✅ Type-safe configuration
- ✅ Better IDE support
- ✅ Cleaner imports
- ✅ No manual storage instantiation

---

## Troubleshooting

### Type errors in config?

Ensure `expo-targets` is installed and types are imported:

```typescript
import { defineTarget } from 'expo-targets';
// Types auto-imported, no need for explicit import
```

### Widget not finding types?

Check barrel export includes type exports:

```typescript
// targets/index.ts
export { HelloWidget } from './hello-widget';
export type { HelloWidgetData } from './hello-widget'; // Don't forget!
```

### IDE not autocompleting?

1. Restart TypeScript server in editor
2. Verify `tsconfig.json` includes `targets/**/*.ts`
3. Check package is installed: `bun add expo-targets`

---

## Summary

expo-targets provides a unified TypeScript approach where:

1. **Single file** (`index.ts`) contains config + runtime
2. **Type-safe** configuration with full IDE support
3. **Clean API** for widget data operations
4. **Export types** for type-safe data objects
5. **Barrel exports** for organized imports

This approach provides the best developer experience with compile-time safety and runtime efficiency.
