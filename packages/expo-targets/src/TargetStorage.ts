import Constants from 'expo-constants';

import ExpoTargetsModule from './TargetStorageModule';
import type {
  TargetConfig,
  ExtensionType,
  IOSTargetConfig,
  AndroidTargetConfig,
} from '../plugin/src/config';

export class AppGroupStorage {
  constructor(private readonly appGroup: string) {}

  set(
    key: string,
    value?:
      | string
      | number
      | Record<string, string | number>
      | Record<string, string | number>[]
  ) {
    if (typeof value === 'number') {
      ExpoTargetsModule.setInt(key, value, this.appGroup);
    } else if (typeof value === 'string') {
      ExpoTargetsModule.setString(key, value, this.appGroup);
    } else if (value == null) {
      ExpoTargetsModule.remove(key, this.appGroup);
    } else if (Array.isArray(value)) {
      ExpoTargetsModule.setString(key, JSON.stringify(value), this.appGroup);
    } else {
      ExpoTargetsModule.setString(key, JSON.stringify(value), this.appGroup);
    }
  }

  get(key: string): string | null {
    return ExpoTargetsModule.get(key, this.appGroup);
  }

  remove(key: string) {
    ExpoTargetsModule.remove(key, this.appGroup);
  }
}

// Legacy export for backward compatibility
export class TargetStorage extends AppGroupStorage {
  constructor(
    appGroup: string,
    private readonly targetName?: string
  ) {
    super(appGroup);
  }

  refresh() {
    ExpoTargetsModule.refreshTarget(this.targetName);
  }
}

export interface Target {
  readonly name: string;
  readonly storage: AppGroupStorage;
  set(key: string, value: any): void;
  get(key: string): string | null;
  remove(key: string): void;
  setData<T>(data: T): void;
  getData<T>(): T | null;
  refresh(): void;
}

/**
 * Creates a target by name. Config is handled at build time by expo-target.config file.
 * This follows the Expo Modules pattern: just like requireNativeModule('Name').
 *
 * The expo-target.config file is used at BUILD TIME by the config plugin.
 * At runtime, just pass the target name - appGroup is auto-detected.
 *
 * @param name - The target name (must match the 'name' in expo-target.config)
 *
 * @example
 * // targets/my-widget/index.ts
 * import { createTarget } from 'expo-targets';
 *
 * // Just the name - exactly like requireNativeModule('Name')
 * export const myWidget = createTarget('MyWidget');
 */
export function createTarget(name: string): Target {
  // Auto-detect appGroup from multiple sources
  let appGroup: string | undefined;

  // 1. Try to get from target-specific config (injected by config plugin)
  const targetMetadata = (Constants.expoConfig?.extra as any)?.expoTargets?.[
    name
  ];
  if (targetMetadata?.appGroup) {
    appGroup = targetMetadata.appGroup;
    console.log(
      `[expo-targets] Using App Group from ${name} config: ${appGroup}`
    );
  }
  // 2. Fallback to main app entitlements
  else {
    const appGroups =
      Constants.expoConfig?.ios?.entitlements?.[
        'com.apple.security.application-groups'
      ];
    if (Array.isArray(appGroups) && appGroups.length > 0) {
      appGroup = appGroups[0];
      console.log(
        `[expo-targets] Using App Group from main app entitlements: ${appGroup}`
      );
    }
  }

  const validateAppGroup = () => {
    if (!appGroup) {
      throw new Error(
        `Cannot use storage: appGroup not configured. ` +
          `Ensure App Groups are configured in app.json under ios.entitlements`
      );
    }
  };

  const storage = new AppGroupStorage(appGroup || '');
  const dataKey = `${name}:data`;

  return {
    name,
    storage,

    set(key: string, value: any) {
      validateAppGroup();
      storage.set(key, value);
    },

    get(key: string) {
      validateAppGroup();
      return storage.get(key);
    },

    remove(key: string) {
      validateAppGroup();
      storage.remove(key);
    },

    setData<T>(data: T) {
      validateAppGroup();
      storage.set(dataKey, data as any);
    },

    getData<T>(): T | null {
      validateAppGroup();
      const raw = storage.get(dataKey);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    refresh() {
      ExpoTargetsModule.refreshTarget(name);
    },
  };
}

export function refreshAllTargets(): void {
  ExpoTargetsModule.refreshTarget();
}

export function close(): void {
  ExpoTargetsModule.closeExtension();
}

export function openHostApp(path: string): void {
  ExpoTargetsModule.openHostApp(path);
}

export async function clearSharedData(): Promise<void> {
  console.warn('clearSharedData not yet implemented');
}
