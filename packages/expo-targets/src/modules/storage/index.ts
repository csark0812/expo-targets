import { requireNativeModule } from 'expo-modules-core';

const ExpoTargetsStorageModule = requireNativeModule('ExpoTargetsStorage') as {
  setInt: (
    key: string,
    value: number,
    suite: string | null,
    targetName?: string
  ) => void;
  setString: (
    key: string,
    value: string,
    suite: string | null,
    targetName?: string
  ) => void;
  remove: (key: string, suite: string | null, targetName?: string) => void;
  get: (
    key: string,
    suite: string | null,
    targetName?: string
  ) => string | null;
  getAllData: (
    suite: string | null,
    targetName?: string
  ) => Record<string, unknown>;
  getAllKeys: (suite: string | null, targetName?: string) => string[];
  clearAll: (suite: string | null, targetName?: string) => void;
  refreshTarget: (name?: string | null) => void;
  getTargetsConfig: () => unknown[] | null;
  isAppExtension?: () => boolean;
  /** Android: start VpnService.prepare consent UI when needed. */
  prepareVpn?: () => string;
};

export class AppGroupStorage {
  constructor(
    private readonly appGroup: string,
    private readonly targetName?: string
  ) {}

  set(key: string, value: any) {
    if (value === null || value === undefined) {
      ExpoTargetsStorageModule.remove(key, this.appGroup, this.targetName);
    } else if (typeof value === 'number') {
      ExpoTargetsStorageModule.setInt(
        key,
        Math.floor(value),
        this.appGroup,
        this.targetName
      );
    } else if (typeof value === 'string') {
      ExpoTargetsStorageModule.setString(
        key,
        value,
        this.appGroup,
        this.targetName
      );
    } else if (typeof value === 'boolean') {
      ExpoTargetsStorageModule.setInt(
        key,
        value ? 1 : 0,
        this.appGroup,
        this.targetName
      );
    } else if (Array.isArray(value)) {
      ExpoTargetsStorageModule.setString(
        key,
        JSON.stringify(value),
        this.appGroup,
        this.targetName
      );
    } else {
      ExpoTargetsStorageModule.setString(
        key,
        JSON.stringify(value),
        this.appGroup,
        this.targetName
      );
    }
  }

  get<T = any>(key: string): T | null {
    try {
      const value = ExpoTargetsStorageModule.get(
        key,
        this.appGroup,
        this.targetName
      );
      if (value === null || value === undefined) {
        return null;
      }

      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      }

      return value as T;
    } catch {
      return null;
    }
  }

  remove(key: string) {
    ExpoTargetsStorageModule.remove(key, this.appGroup, this.targetName);
  }

  clear() {
    ExpoTargetsStorageModule.clearAll(this.appGroup, this.targetName);
  }

  setData(data: Record<string, any>) {
    for (const [key, value] of Object.entries(data)) {
      this.set(key, value);
    }
  }

  getData<T extends Record<string, any>>(): T {
    try {
      const rawData = ExpoTargetsStorageModule.getAllData(
        this.appGroup,
        this.targetName
      );
      if (!rawData || typeof rawData !== 'object') {
        return {} as T;
      }

      const parsedData: Record<string, any> = {};

      for (const [key, value] of Object.entries(rawData)) {
        if (typeof value === 'string') {
          try {
            parsedData[key] = JSON.parse(value);
          } catch {
            parsedData[key] = value;
          }
        } else {
          parsedData[key] = value;
        }
      }

      return parsedData as T;
    } catch {
      return {} as T;
    }
  }

  getKeys(): string[] {
    try {
      return ExpoTargetsStorageModule.getAllKeys(
        this.appGroup,
        this.targetName
      );
    } catch {
      return [];
    }
  }

  refresh(targetName?: string) {
    ExpoTargetsStorageModule.refreshTarget(targetName ?? this.targetName);
  }
}

export function refreshAllTargets() {
  ExpoTargetsStorageModule.refreshTarget(undefined);
}

export function clearSharedData(appGroup: string) {
  const storage = new AppGroupStorage(appGroup);
  storage.clear();
}

export function getTargetsConfigFromBundle(): any[] | null {
  try {
    return ExpoTargetsStorageModule.getTargetsConfig();
  } catch {
    return null;
  }
}

/** True inside an iOS .appex (share/action/…). */
export function isAppExtension(): boolean {
  try {
    return ExpoTargetsStorageModule.isAppExtension?.() ?? false;
  } catch {
    return false;
  }
}

/**
 * Android host: show VpnService.prepare consent UI when required.
 * Returns `consent-shown` | `already-consented` | `unavailable`.
 */
export function prepareVpnConsent(): string {
  try {
    return ExpoTargetsStorageModule.prepareVpn?.() ?? "unavailable";
  } catch {
    return "unavailable";
  }
}
