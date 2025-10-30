import { requireNativeModule } from 'expo-modules-core';

const ExpoTargetsStorageModule = requireNativeModule('ExpoTargetsStorage');

export class AppGroupStorage {
  constructor(private readonly appGroup: string) {}

  set(key: string, value: any) {
    if (value === null || value === undefined) {
      ExpoTargetsStorageModule.remove(key, this.appGroup);
    } else if (typeof value === 'number') {
      ExpoTargetsStorageModule.setInt(key, Math.floor(value), this.appGroup);
    } else if (typeof value === 'string') {
      ExpoTargetsStorageModule.setString(key, value, this.appGroup);
    } else if (typeof value === 'boolean') {
      ExpoTargetsStorageModule.setInt(key, value ? 1 : 0, this.appGroup);
    } else if (value === null || value === undefined) {
      ExpoTargetsStorageModule.remove(key, this.appGroup);
    } else if (Array.isArray(value)) {
      ExpoTargetsStorageModule.setString(
        key,
        JSON.stringify(value),
        this.appGroup
      );
    } else {
      ExpoTargetsStorageModule.setString(
        key,
        JSON.stringify(value),
        this.appGroup
      );
    }
  }

  get<T = any>(key: string): T | null {
    try {
      const value = ExpoTargetsStorageModule.get(key, this.appGroup);
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
    } catch (error) {
      console.warn(`Failed to get value for key "${key}":`, error);
      return null;
    }
  }

  remove(key: string) {
    ExpoTargetsStorageModule.remove(key, this.appGroup);
  }

  clear() {
    console.warn(
      'AppGroupStorage.clear() is not implemented. Remove keys individually.'
    );
  }

  setData(data: Record<string, any>) {
    Object.entries(data).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  getData<T extends Record<string, any>>(): T {
    console.warn(
      'AppGroupStorage.getData() is not fully implemented. Use get() for individual keys.'
    );
    return {} as T;
  }

  refresh(targetName?: string) {
    ExpoTargetsStorageModule.refreshTarget(targetName);
  }
}

export function refreshAllTargets() {
  ExpoTargetsStorageModule.refreshTarget(undefined);
}

export function clearSharedData(appGroup: string) {
  const storage = new AppGroupStorage(appGroup);
  storage.clear();
}
