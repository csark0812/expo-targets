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

export type DefineTargetOptions = TargetConfig;

export function defineTarget(options: DefineTargetOptions): Target {
  // Validate required fields at runtime
  if (!options.name) {
    throw new Error(
      `defineTarget() requires 'name' to be specified or auto-derived from directory. ` +
        `This should not happen if using the plugin correctly.`
    );
  }

  // Try to inherit appGroup from expo config if not provided
  let appGroup = options.appGroup;
  if (!appGroup) {
    const appGroups =
      Constants.expoConfig?.ios?.entitlements?.[
        'com.apple.security.application-groups'
      ];
    if (Array.isArray(appGroups) && appGroups.length > 0) {
      appGroup = appGroups[0];
      console.log(
        `[expo-targets] Inherited App Group from config: ${appGroup}`
      );
    }
  }

  const validateAppGroup = () => {
    if (!appGroup) {
      throw new Error(
        `Cannot use storage: appGroup not configured. ` +
          `Add 'appGroup' to defineTarget() or ensure App Groups are configured in app.json`
      );
    }
  };

  const storage = new AppGroupStorage(appGroup || '');
  const dataKey = `${options.name}:data`;

  return {
    name: options.name,
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
      ExpoTargetsModule.refreshTarget(options.name!);
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
