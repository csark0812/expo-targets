# API Reference

Complete API documentation for expo-targets.

## Platform Capabilities

### `ExpoTargets.capabilities`

Query platform capabilities to detect Android version and feature support.

**Signature:**

```typescript
interface Capabilities {
  supportsGlance: boolean;
  platformVersion: number;
}

const capabilities: Capabilities;
```

**Properties:**

- `supportsGlance` (boolean): Whether the platform supports Glance (Android 13+/API 33+). Always `false` on iOS.
- `platformVersion` (number): Platform version number. Android API level on Android, always `0` on iOS.

**Example:**

```typescript
import { ExpoTargets } from 'expo-targets';

const { supportsGlance, platformVersion } = ExpoTargets.capabilities;

if (supportsGlance) {
  console.log('Can use Glance API');
} else {
  console.log('Using legacy AppWidget');
}

console.log(`Running on Android API ${platformVersion}`);
```

**Platform Behavior:**

| Platform     | `supportsGlance` | `platformVersion`       |
| ------------ | ---------------- | ----------------------- |
| iOS          | `false`          | `0`                     |
| Android < 13 | `false`          | API level (e.g., 26-32) |
| Android ≥ 13 | `true`           | API level (e.g., 33+)   |

---

## Core Functions

### `createTarget(name)`

Creates a target instance for interacting with an extension.

**Signature:**

```typescript
function createTarget(name: string): Target;
```

**Parameters:**

- `name` (string): Target name as specified in `expo-target.config.json`

**Returns:** `Target` instance

**Example:**

```typescript
import { createTarget } from 'expo-targets';

export const myWidget = createTarget('MyWidget');
```

**Requirements:**

- Target must be configured in `targets/{dir}/expo-target.config.json`
- Target config must be loaded (happens during prebuild)
- App Group must be configured

---

## Target Instance

The object returned by `createTarget()` with methods for data storage and lifecycle control.

### `Target.set(key, value)`

Stores a value for a specific key in the shared App Group storage.

**Signature:**

```typescript
set(key: string, value: any): void
```

**Parameters:**

- `key` (string): Storage key
- `value` (any): Value to store
  - Strings: Stored directly
  - Numbers: Stored as integers
  - Booleans: Stored as 0 or 1
  - Objects/Arrays: JSON-stringified
  - `null` or `undefined`: Removes the key

**Examples:**

```typescript
import { myWidget } from './targets/my-widget';

myWidget.set('message', 'Hello World');
myWidget.set('count', 42);
myWidget.set('user', { name: 'John', age: 30 });
myWidget.set('items', ['apple', 'banana']);
myWidget.set('message', null); // Remove key
```

### `Target.get(key)`

Retrieves a value from storage.

**Signature:**

```typescript
get<T = any>(key: string): T | null
```

**Parameters:**

- `key` (string): Storage key

**Returns:** Parsed value or `null` if not found

**Examples:**

```typescript
const message = myWidget.get<string>('message');
const count = myWidget.get<number>('count');
const user = myWidget.get<{ name: string; age: number }>('user');
```

**Notes:**

- Automatically parses JSON strings
- Returns `null` if key doesn't exist
- Type parameter is optional but recommended

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
myWidget.remove('message');
// Equivalent to: myWidget.set('message', null);
```

### `Target.clear()`

Removes all data from storage for this App Group.

**Signature:**

```typescript
clear(): void
```

**Example:**

```typescript
myWidget.clear();
myWidget.refresh();
```

**Warning:** Clears ALL data in the App Group, including data from other targets sharing the same App Group.

### `Target.setData(data)`

Stores multiple key-value pairs at once.

**Signature:**

```typescript
setData(data: Record<string, any>): void
```

**Parameters:**

- `data` (Record<string, any>): Object with key-value pairs

**Example:**

```typescript
myWidget.setData({
  message: 'Hello Widget!',
  count: 42,
  timestamp: Date.now(),
  user: { name: 'John' },
});
```

**Notes:**

- Each property becomes a separate storage key
- Equivalent to calling `set()` for each property

### `Target.getData()`

Retrieves all data from storage.

**Signature:**

```typescript
getData<T extends Record<string, any>>(): T
```

**Returns:** Object with all key-value pairs

**Example:**

```typescript
interface WidgetData {
  message: string;
  count: number;
  timestamp: number;
}

const data = myWidget.getData<WidgetData>();
console.log(data.message);
```

**Notes:**

- Returns empty object if no data exists
- Automatically parses JSON values
- Returns ALL data in the App Group

### `Target.refresh()`

Refreshes this specific target to update its UI with new data.

**Signature:**

```typescript
refresh(): void
```

**Platform support:**

- iOS 14.0+: Calls `WidgetCenter.shared.reloadTimelines(ofKind:)`
- iOS 18.0+: Also calls `ControlCenter.shared.reloadControls(ofKind:)`

**Example:**

```typescript
myWidget.set('message', 'Updated!');
myWidget.refresh();
```

**Notes:**

- Call after updating data to trigger UI update
- Widget updates according to its timeline policy
- For immediate updates, use `.atEnd` policy in Swift

### `Target.storage`

Direct access to the underlying `AppGroupStorage` instance.

**Type:** `AppGroupStorage`

**Example:**

```typescript
const storage = myWidget.storage;
const keys = storage.getKeys();
```

### Extension-Specific Methods

For targets with `type: 'share' | 'action' | 'clip'`, additional methods are available:

#### `Target.close()`

Closes the current extension.

**Signature:**

```typescript
close(): void
```

**Platform:** iOS 13.0+

**Example:**

```typescript
shareExtension.close();
```

#### `Target.openHostApp(path)`

Opens the main app from an extension with a deep link.

**Signature:**

```typescript
openHostApp(path?: string): void
```

**Parameters:**

- `path` (string, optional): Deep link path (e.g., `/home`, `/profile/123`)

**Platform:** iOS 13.0+

**Example:**

```typescript
shareExtension.openHostApp('/share-received');
```

#### `Target.getSharedData()`

Gets content shared to the extension.

**Signature:**

```typescript
getSharedData(): SharedData | null
```

**Returns:**

```typescript
interface SharedData {
  text?: string;
  url?: string;
  images?: string[];
  webpageUrl?: string;
  webpageTitle?: string;
  preprocessedData?: any;
}
```

**Platform:** iOS

**Example:**

```typescript
const data = shareExtension.getSharedData();
if (data?.url) {
  console.log('Shared URL:', data.url);
}
```

---

## Utility Functions

### `refreshAllTargets()`

Refreshes all targets (widgets, controls, etc.) to update their UI.

**Signature:**

```typescript
function refreshAllTargets(): void;
```

**Platform support:**

- iOS 14.0+: Calls `WidgetCenter.shared.reloadAllTimelines()`
- iOS 18.0+: Also calls `ControlCenter.shared.reloadAllControls()`

**Example:**

```typescript
import { refreshAllTargets } from 'expo-targets';
import { widget1, widget2 } from './targets';

widget1.set('data', value1);
widget2.set('data', value2);

refreshAllTargets();
```

### `clearSharedData(appGroup)`

Clears all data for an App Group.

**Signature:**

```typescript
function clearSharedData(appGroup: string): void;
```

**Parameters:**

- `appGroup` (string): App Group identifier (e.g., `group.com.yourapp`)

**Example:**

```typescript
import { clearSharedData } from 'expo-targets';

clearSharedData('group.com.yourapp');
```

### `close()`

Closes the current extension.

**Signature:**

```typescript
function close(): void;
```

**Platform:** iOS 13.0+

**Use cases:** Share extensions, action extensions

**Example:**

```typescript
import { close } from 'expo-targets';

function handleShare(url: string) {
  // Process...
  close();
}
```

### `openHostApp(path)`

Opens the main app from an extension.

**Signature:**

```typescript
function openHostApp(path?: string): void;
```

**Parameters:**

- `path` (string, optional): Deep link path

**Platform:** iOS 13.0+

**Example:**

```typescript
import { openHostApp } from 'expo-targets';

openHostApp('/share?url=https://example.com');
```

### `getSharedData()`

Gets content shared to the extension.

**Signature:**

```typescript
function getSharedData(): SharedData | null;
```

**Returns:** `SharedData` object or `null`

**Platform:** iOS

**Example:**

```typescript
import { getSharedData } from 'expo-targets';

const data = getSharedData();
if (data?.text) {
  console.log('Shared text:', data.text);
}
```

---

## AppGroupStorage Class

Low-level storage class for direct App Group access.

### Constructor

```typescript
new AppGroupStorage(appGroup: string)
```

**Parameters:**

- `appGroup` (string): App Group identifier

**Example:**

```typescript
import { AppGroupStorage } from 'expo-targets';

const storage = new AppGroupStorage('group.com.yourapp');
```

### Methods

```typescript
// Storage operations
set(key: string, value: any): void
get<T>(key: string): T | null
remove(key: string): void
clear(): void

// Batch operations
setData(data: Record<string, any>): void
getData<T>(): T

// Utility
getKeys(): string[]
refresh(targetName?: string): void
```

**Example:**

```typescript
const storage = new AppGroupStorage('group.com.yourapp');

storage.set('key', 'value');
const value = storage.get<string>('key');
const keys = storage.getKeys();
storage.refresh('WidgetName');
```

---

## Type Definitions

### `Target`

```typescript
interface Target {
  readonly name: string;
  readonly type: ExtensionType;
  readonly appGroup: string;
  readonly storage: AppGroupStorage;
  readonly config: TargetConfig;

  set(key: string, value: any): void;
  get<T>(key: string): T | null;
  remove(key: string): void;
  clear(): void;

  setData(data: Record<string, any>): void;
  getData<T>(): T;

  refresh(): void;

  // Extension-specific (share, action, clip only)
  close?(): void;
  openHostApp?(path?: string): void;
  getSharedData?(): SharedData | null;
}
```

### `ExtensionType`

```typescript
type ExtensionType =
  | 'widget'
  | 'clip'
  | 'stickers'
  | 'share'
  | 'action'
  | 'safari'
  | 'notification-content'
  | 'notification-service'
  | 'intent'
  | 'intent-ui'
  | 'spotlight'
  | 'bg-download'
  | 'quicklook-thumbnail'
  | 'location-push'
  | 'credentials-provider'
  | 'account-auth'
  | 'app-intent'
  | 'device-activity-monitor'
  | 'matter'
  | 'watch';
```

### `SharedData`

```typescript
interface SharedData {
  text?: string;
  url?: string;
  images?: string[];
  webpageUrl?: string;
  webpageTitle?: string;
  preprocessedData?: any;
}
```

### `TargetConfig`

```typescript
interface TargetConfig {
  name: string;
  displayName?: string;
  type: ExtensionType;
  platforms: string[];
  appGroup?: string;
  entry?: string;
  excludedPackages?: string[];
  ios?: IOSTargetConfig;
  android?: AndroidTargetConfig;
}
```

---

## Complete Examples

### Basic Widget

```typescript
// targets/simple-widget/index.ts
import { createTarget } from 'expo-targets';

export const simpleWidget = createTarget('SimpleWidget');

// App.tsx
import { simpleWidget } from './targets/simple-widget';

function updateWidget() {
  simpleWidget.set('message', 'Hello!');
  simpleWidget.refresh();
}
```

### Type-Safe Widget

```typescript
// targets/dashboard/index.ts
import { createTarget } from 'expo-targets';

export const dashboard = createTarget('Dashboard');

export interface DashboardData {
  revenue: number;
  users: number;
  growth: number;
}

// App.tsx
import { dashboard } from './targets/dashboard';
import type { DashboardData } from './targets/dashboard';

function updateDashboard(stats: DashboardData) {
  dashboard.setData(stats);
  dashboard.refresh();
}
```

### Multiple Widgets

```typescript
// targets/index.ts
export { widget1, Widget1Data } from './widget1';
export { widget2, Widget2Data } from './widget2';
export { widget3, Widget3Data } from './widget3';

// App.tsx
import { refreshAllTargets } from 'expo-targets';
import { widget1, widget2, widget3 } from './targets';

function updateAll() {
  widget1.set('data', value1);
  widget2.set('data', value2);
  widget3.set('data', value3);

  refreshAllTargets();
}
```

### Share Extension

```typescript
// targets/share-ext/index.ts
import { createTarget } from 'expo-targets';

export const shareExt = createTarget('ShareExt');

// Share extension code
import { shareExt, getSharedData } from './targets/share-ext';

function handleShare() {
  const data = getSharedData();

  if (data?.url) {
    shareExt.set('lastShared', data.url);
    shareExt.set('timestamp', Date.now());
  }

  shareExt.close();
}
```

---

## Platform Support

| API                   | iOS        | Android   |
| --------------------- | ---------- | --------- |
| `createTarget()`      | ✅ iOS 13+ | 🔜 Coming |
| `Target.set()`        | ✅ iOS 13+ | 🔜 Coming |
| `Target.get()`        | ✅ iOS 13+ | 🔜 Coming |
| `Target.setData()`    | ✅ iOS 13+ | 🔜 Coming |
| `Target.getData()`    | ✅ iOS 13+ | 🔜 Coming |
| `Target.refresh()`    | ✅ iOS 14+ | 🔜 Coming |
| `refreshAllTargets()` | ✅ iOS 14+ | 🔜 Coming |
| `clearSharedData()`   | ✅ iOS 13+ | 🔜 Coming |
| `close()`             | ✅ iOS 13+ | 🔜 Coming |
| `openHostApp()`       | ✅ iOS 13+ | 🔜 Coming |
| `getSharedData()`     | ✅ iOS 13+ | 🔜 Coming |

---

## Best Practices

### Use Type-Safe Data

```typescript
// ✅ Good: Type-safe
interface WidgetData {
  message: string;
  count: number;
}

const data: WidgetData = { message: 'Hello', count: 42 };
widget.setData(data);

// ❌ Avoid: Untyped
widget.setData({ message: 'Hello', count: 42 });
```

### Batch Updates

```typescript
// ✅ Efficient: Update once
widget1.set('data', value1);
widget2.set('data', value2);
refreshAllTargets();

// ❌ Inefficient: Multiple refreshes
widget1.set('data', value1);
widget1.refresh();
widget2.set('data', value2);
widget2.refresh();
```

### Handle Errors

```typescript
// ✅ Good: Handle parsing errors
try {
  const data = widget.getData<WidgetData>();
  if (data) {
    // Use data
  }
} catch (error) {
  console.error('Failed to parse widget data:', error);
}
```

### Create Barrel Exports

```typescript
// targets/index.ts
export { widget1, Widget1Data } from './widget1';
export { widget2, Widget2Data } from './widget2';

// App.tsx
import { widget1, widget2 } from './targets';
```

---

## See Also

- [Configuration Reference](./config-reference.md)
- [Getting Started Guide](./getting-started.md)
- [Example Apps](../apps/)
