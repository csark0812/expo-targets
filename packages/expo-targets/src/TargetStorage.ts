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

export interface DefineTargetOptions {
  name: string;
  appGroup: string;
  type: ExtensionType;
  displayName?: string;
  platforms: {
    ios?: IOSTargetConfig;
    android?: AndroidTargetConfig;
  };
}

export function defineTarget(options: DefineTargetOptions): Target {
  const storage = new AppGroupStorage(options.appGroup);
  const dataKey = `${options.name}:data`;

  return {
    name: options.name,
    storage,

    set(key: string, value: any) {
      storage.set(key, value);
    },

    get(key: string) {
      return storage.get(key);
    },

    remove(key: string) {
      storage.remove(key);
    },

    setData<T>(data: T) {
      storage.set(dataKey, data as any);
    },

    getData<T>(): T | null {
      const raw = storage.get(dataKey);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    refresh() {
      ExpoTargetsModule.refreshTarget(options.name);
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
