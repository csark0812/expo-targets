# API Reference

Complete TypeScript/JavaScript API reference for expo-targets.

## Core Functions

### `defineTarget(options)`

Creates a type-safe target instance with built-in data storage and lifecycle methods.

**Signature:**

```typescript
function defineTarget(options: DefineTargetOptions): Target;
```

**Options:**

```typescript
interface DefineTargetOptions {
  name: string; // Required: Target identifier (must match directory name)
  appGroup: string; // Required: App Group for shared storage
  type: ExtensionType; // Required: Extension type
  displayName?: string; // Optional: Human-readable name
  platforms: {
    ios?: IOSTargetConfig; // iOS platform configuration
    android?: AndroidTargetConfig; // Android configuration (coming soon)
  };
}
```

**Returns:** `Target` instance

**Example:**

```typescript
import { defineTarget } from 'expo-targets';

export const HelloWidget = defineTarget({
  name: 'hello-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  displayName: 'Hello Widget',
  platforms: {
    ios: {
      deploymentTarget: '14.0',
      colors: {
        $accent: '#007AFF',
        $background: { light: '#FFFFFF', dark: '#1C1C1E' },
      },
    },
  },
});

export type HelloWidgetData = {
  message: string;
  count?: number;
};
```

---

## Target Instance

The object returned by `defineTarget()` with methods for data storage and widget control.

### `Target.set(key, value)`

Stores a value for a specific key in the shared App Group storage.

**Signature:**

```typescript
set(key: string, value?: string | number | object | array): void
```

**Parameters:**

- `key` (string): Storage key
- `value` (string | number | object | array | undefined): Value to store
  - Strings: Stored directly
  - Numbers: Stored as integers
  - Objects/Arrays: JSON-stringified before storage
  - `undefined` or `null`: Removes the key

**Examples:**

```typescript
import { HelloWidget } from './targets/hello-widget';

// Store string
HelloWidget.set('message', 'Hello World');

// Store number
HelloWidget.set('count', 42);

// Store object
HelloWidget.set('user', { name: 'John', age: 30 });

// Store array
HelloWidget.set('items', ['apple', 'banana', 'orange']);

// Remove key
HelloWidget.set('message', undefined);
```

### `Target.get(key)`

Retrieves a value from the shared App Group storage.

**Signature:**

```typescript
get(key: string): string | null
```

**Parameters:**

- `key` (string): Storage key

**Returns:** `string | null` - The stored value as a string, or `null` if not found

**Examples:**

```typescript
// Get string
const message = HelloWidget.get('message');
console.log(message); // "Hello World" or null

// Get number (parse manually)
const countStr = HelloWidget.get('count');
const count = countStr ? parseInt(countStr) : 0;

// Get object (parse JSON manually)
const userStr = HelloWidget.get('user');
const user = userStr ? JSON.parse(userStr) : null;
```

### `Target.remove(key)`

Removes a key-value pair from storage.

**Signature:**

```typescript
remove(key: string): void
```

**Parameters:**

- `key` (string): Storage key to remove

**Example:**

```typescript
HelloWidget.remove('message');
// Equivalent to: HelloWidget.set('message', undefined);
```

### `Target.setData(data)`

Stores a complete data object for the target using a namespaced key.

**Signature:**

```typescript
setData<T>(data: T): void
```

**Parameters:**

- `data` (T): Data object to store (will be JSON-stringified)

**Storage key:** `{targetName}:data` (e.g., `hello-widget:data`)

**Example:**

```typescript
import { HelloWidget } from './targets/hello-widget';
import type { HelloWidgetData } from './targets/hello-widget';

const data: HelloWidgetData = {
  message: 'Hello Widget!',
  count: 42,
  timestamp: Date.now(),
};

HelloWidget.setData(data);
```

### `Target.getData()`

Retrieves the complete data object for the target.

**Signature:**

```typescript
getData<T>(): T | null
```

**Returns:** `T | null` - Parsed data object, or `null` if not found or invalid JSON

**Example:**

```typescript
const data = HelloWidget.getData<HelloWidgetData>();

if (data) {
  console.log(data.message); // TypeScript knows this exists
  console.log(data.count); // Optional property
}
```

### `Target.refresh()`

Refreshes this specific target to update its UI with new data.

**Signature:**

```typescript
refresh(): void
```

**Platform support:**

- iOS 14.0+: Calls `WidgetCenter.shared.reloadTimelines(ofKind: targetName)`
- iOS 18.0+: Also calls `ControlCenter.shared.reloadControls(ofKind: targetName)`
- Android: Coming soon

**Example:**

```typescript
HelloWidget.set('message', 'Updated!');
HelloWidget.refresh(); // Widget updates immediately
```

### `Target.storage`

Direct access to the underlying `AppGroupStorage` instance for advanced use cases.

**Type:** `AppGroupStorage`

**Example:**

```typescript
// Advanced: Direct storage access
HelloWidget.storage.set('custom-key', 'value');
const value = HelloWidget.storage.get('custom-key');
```

---

## Utility Functions

### `refreshAllTargets()`

Refreshes all targets (widgets, controls, etc.) to update their UI with new data.

**Signature:**

```typescript
function refreshAllTargets(): void;
```

**Platform support:**

- iOS 14.0+: Calls `WidgetCenter.shared.reloadAllTimelines()`
- iOS 18.0+: Also calls `ControlCenter.shared.reloadAllControls()`
- Android: Coming soon

**Example:**

```typescript
import { refreshAllTargets } from 'expo-targets';
import { HelloWidget, DashboardWidget } from './targets';

// Update multiple widgets
HelloWidget.set('message', 'Hello');
DashboardWidget.set('stats', { users: 1000 });

// Refresh all at once
refreshAllTargets();
```

### `close()`

Closes the current extension (for share extensions, action extensions).

**Signature:**

```typescript
function close(): void;
```

**Platform support:** iOS 13.0+

**Use cases:** Share extensions, action extensions

**Example:**

```typescript
import { close } from 'expo-targets';

function handleShare(url: string) {
  // Process shared data...

  // Close the extension
  close();
}
```

**Implementation:** Calls `extensionContext.completeRequest(returningItems:completionHandler:)`

### `openHostApp(path)`

Opens the main app from an extension with a deep link.

**Signature:**

```typescript
function openHostApp(path: string): void;
```

**Parameters:**

- `path` (string): Deep link path (e.g., `/home`, `/profile/123`)

**Platform support:** iOS 13.0+

**Requirements:**

- Configure deep linking in main app
- Extension must have URL opening permissions

**Example:**

```typescript
import { openHostApp } from 'expo-targets';

function openMainApp() {
  openHostApp('/share-received');
}
```

**Implementation:** Constructs URL from bundle identifier and calls `extensionContext.open(url:completionHandler:)`

### `clearSharedData()`

Clears all shared data for the extension.

**Signature:**

```typescript
async function clearSharedData(): Promise<void>;
```

**Platform support:** Coming soon

**Example:**

```typescript
import { clearSharedData } from 'expo-targets';

async function cleanup() {
  await clearSharedData();
}
```

---

## Legacy API (Backward Compatible)

### `TargetStorage` Class

Manual storage class for backward compatibility. **Prefer `defineTarget()` for new code.**

**Constructor:**

```typescript
new TargetStorage(appGroup: string, targetName?: string)
```

**Parameters:**

- `appGroup` (string): App Group identifier
- `targetName` (string, optional): Target name for refresh operations

**Methods:**

```typescript
set(key: string, value?: string | number | object | array): void
get(key: string): string | null
remove(key: string): void
refresh(): void  // Refreshes the specific target
```

**Example:**

```typescript
import { TargetStorage } from 'expo-targets';

const storage = new TargetStorage('group.com.yourapp', 'hello-widget');

storage.set('message', 'Hello');
storage.set('count', 42);
storage.refresh();

const message = storage.get('message');
console.log(message); // "Hello"
```

### `AppGroupStorage` Class

Low-level storage class without widget refresh capability.

**Constructor:**

```typescript
new AppGroupStorage(appGroup: string)
```

**Methods:**

```typescript
set(key: string, value?: string | number | object | array): void
get(key: string): string | null
remove(key: string): void
```

**Example:**

```typescript
import { AppGroupStorage } from 'expo-targets';

const storage = new AppGroupStorage('group.com.yourapp');
storage.set('key', 'value');
```

---

## Type Definitions

### `DefineTargetOptions`

Configuration options for `defineTarget()`.

```typescript
interface DefineTargetOptions {
  name: string;
  appGroup: string;
  type: ExtensionType;
  displayName?: string;
  platforms: {
    ios?: IOSTargetConfig;
    android?: AndroidTargetConfig;
  };
}
```

### `Target`

Target instance returned by `defineTarget()`.

```typescript
interface Target {
  readonly name: string;
  readonly storage: AppGroupStorage;

  set(key: string, value: any): void;
  get(key: string): string | null;
  remove(key: string): void;

  setData<T>(data: T): void;
  getData<T>(): T | null;

  refresh(): void;
}
```

### `ExtensionType`

Supported extension types.

```typescript
type ExtensionType =
  | 'widget' // Home screen widgets
  | 'clip' // App Clips
  | 'imessage' // iMessage sticker packs
  | 'share' // Share extensions
  | 'action' // Action extensions
  | 'safari' // Safari extensions
  | 'notification-content' // Notification content extensions
  | 'notification-service' // Notification service extensions
  | 'intent' // Siri intent extensions
  | 'intent-ui' // Siri intent UI extensions
  | 'spotlight' // Spotlight index extensions
  | 'bg-download' // Background download extensions
  | 'quicklook-thumbnail' // QuickLook thumbnail extensions
  | 'location-push' // Location push service extensions
  | 'credentials-provider' // Credential provider extensions
  | 'account-auth' // Account authentication extensions
  | 'app-intent' // App intent extensions
  | 'device-activity-monitor' // Device activity monitor extensions
  | 'matter' // Matter extensions
  | 'watch'; // Watch app extensions
```

### `IOSTargetConfig`

iOS platform configuration.

```typescript
interface IOSTargetConfig {
  icon?: string; // Path to icon file
  deploymentTarget?: string; // Minimum iOS version (e.g., '14.0')
  bundleIdentifier?: string; // Relative or absolute bundle ID
  displayName?: string; // Platform-specific display name
  colors?: Record<string, string | Color>; // Named colors for Assets.xcassets
  images?: Record<string, string>; // Named images for Assets.xcassets
  frameworks?: string[]; // Additional frameworks to link
  entitlements?: Record<string, any>; // Custom entitlements
  buildSettings?: Record<string, string>; // Custom Xcode build settings
  useReactNative?: boolean; // Enable React Native rendering
  excludedPackages?: string[]; // Packages to exclude from RN bundle
}
```

### `Color`

Color definition with light/dark mode support.

```typescript
interface Color {
  light?: string; // Light mode color (hex, rgb, or named)
  dark?: string; // Dark mode color
  color?: string; // Alternative property for light mode
  darkColor?: string; // Alternative property for dark mode
}
```

**Examples:**

```typescript
// Simple color
$accent: '#007AFF'

// Light/dark mode
$background: { light: '#FFFFFF', dark: '#000000' }

// Alternative syntax
$primary: { color: '#007AFF', darkColor: '#0A84FF' }
```

### `AndroidTargetConfig`

Android platform configuration (coming soon).

```typescript
interface AndroidTargetConfig {
  resourceName?: string; // Resource name for widget
  // More options coming
}
```

---

## Complete Usage Examples

### Basic Widget with Simple Storage

```typescript
// targets/hello-widget/index.ts
import { defineTarget } from 'expo-targets';

export const HelloWidget = defineTarget({
  name: 'hello-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  platforms: { ios: { deploymentTarget: '14.0' } },
});

// App.tsx
import { HelloWidget } from './targets/hello-widget';

function updateWidget() {
  HelloWidget.set('message', 'Hello!');
  HelloWidget.refresh();
}
```

### Type-Safe Widget Data

```typescript
// targets/dashboard-widget/index.ts
import { defineTarget } from 'expo-targets';

export const DashboardWidget = defineTarget({
  name: 'dashboard-widget',
  appGroup: 'group.com.yourapp',
  type: 'widget',
  platforms: { ios: {} },
});

export type DashboardData = {
  revenue: number;
  users: number;
  growth: number;
};

// App.tsx
import { DashboardWidget } from './targets/dashboard-widget';
import type { DashboardData } from './targets/dashboard-widget';

async function updateDashboard() {
  const stats = await fetchStats();

  const data: DashboardData = {
    revenue: stats.revenue,
    users: stats.users,
    growth: stats.growth,
  };

  DashboardWidget.setData(data);
  DashboardWidget.refresh();
}
```

### Multiple Widgets

```typescript
// targets/index.ts
export { HelloWidget } from './hello-widget';
export { DashboardWidget } from './dashboard-widget';
export { WeatherWidget } from './weather-widget';

export type { HelloWidgetData } from './hello-widget';
export type { DashboardData } from './dashboard-widget';
export type { WeatherData } from './weather-widget';

// App.tsx
import { HelloWidget, DashboardWidget, WeatherWidget } from './targets';
import { refreshAllTargets } from 'expo-targets';

function updateAllWidgets() {
  HelloWidget.set('message', 'Hello');
  DashboardWidget.setData({ revenue: 1000, users: 500, growth: 10 });
  WeatherWidget.setData({ temp: 72, condition: 'sunny' });

  // Refresh all at once
  refreshAllTargets();
}
```

### Share Extension

```typescript
// targets/share-extension/index.ts
import { defineTarget } from 'expo-targets';

export const ShareExtension = defineTarget({
  name: 'share-extension',
  appGroup: 'group.com.yourapp',
  type: 'share',
  platforms: {
    ios: {
      useReactNative: true,
      excludedPackages: ['expo-updates'],
    },
  },
});

// Share extension code
import { ShareExtension, close, openHostApp } from './targets';

function handleShare(url: string) {
  ShareExtension.set('lastShared', url);
  ShareExtension.set('shareTime', Date.now());

  // Option 1: Close extension
  close();

  // Option 2: Open main app
  openHostApp(`/share?url=${encodeURIComponent(url)}`);
}
```

---

## Platform Support

| API                   | iOS        | Android   |
| --------------------- | ---------- | --------- |
| `defineTarget()`      | ✅ iOS 13+ | 🔜 Coming |
| `Target.set()`        | ✅ iOS 13+ | 🔜 Coming |
| `Target.get()`        | ✅ iOS 13+ | 🔜 Coming |
| `Target.setData()`    | ✅ iOS 13+ | 🔜 Coming |
| `Target.getData()`    | ✅ iOS 13+ | 🔜 Coming |
| `Target.refresh()`    | ✅ iOS 14+ | 🔜 Coming |
| `refreshAllTargets()` | ✅ iOS 14+ | 🔜 Coming |
| `close()`             | ✅ iOS 13+ | 🔜 Coming |
| `openHostApp()`       | ✅ iOS 13+ | 🔜 Coming |
| `clearSharedData()`   | 🔜 Coming  | 🔜 Coming |

✅ Available | 🔜 Coming Soon

---

## Best Practices

### Use Type-Safe Data Objects

Prefer `setData()` and `getData()` with TypeScript types:

```typescript
// ✅ Good: Type-safe
const data: WidgetData = { message: 'Hello', count: 42 };
Widget.setData(data);

// ❌ Avoid: Manual key-value pairs for complex data
Widget.set('message', 'Hello');
Widget.set('count', 42);
```

### Create Barrel Exports

Organize targets in a single import:

```typescript
// targets/index.ts
export { Widget1, Widget2, Widget3 } from './...';
export type { Widget1Data, Widget2Data } from './...';

// App.tsx
import { Widget1, Widget2 } from './targets';
```

### Batch Updates with `refreshAllTargets()`

When updating multiple widgets, refresh once:

```typescript
// ✅ Efficient
Widget1.set('data', value1);
Widget2.set('data', value2);
refreshAllTargets();

// ❌ Inefficient
Widget1.set('data', value1);
Widget1.refresh();
Widget2.set('data', value2);
Widget2.refresh();
```

### Handle Errors Gracefully

Always handle potential parsing errors:

```typescript
try {
  const data = Widget.getData<WidgetData>();
  if (data) {
    // Use data
  }
} catch (error) {
  console.error('Failed to parse widget data:', error);
}
```

---

## Migration from Old API

### Before (Manual TargetStorage)

```typescript
import { TargetStorage } from 'expo-targets';

const storage = new TargetStorage('group.com.app', 'widget');
storage.set('message', 'Hello');
storage.refresh();
```

### After (defineTarget)

```typescript
import { defineTarget } from 'expo-targets';

export const Widget = defineTarget({
  name: 'widget',
  appGroup: 'group.com.app',
  type: 'widget',
  platforms: { ios: {} },
});

Widget.set('message', 'Hello');
Widget.refresh();
```

**Benefits:**

- Single source of truth (config + runtime in one place)
- Type-safe data operations
- Better IDE autocomplete
- Cleaner imports
