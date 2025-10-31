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
    ExpoTargetsStorageModule.clearAll(this.appGroup);
  }

  setData(data: Record<string, any>) {
    Object.entries(data).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  getData<T extends Record<string, any>>(): T {
    try {
      const rawData = ExpoTargetsStorageModule.getAllData(this.appGroup);
      const parsedData: Record<string, any> = {};

      Object.entries(rawData).forEach(([key, value]) => {
        if (typeof value === 'string') {
          try {
            parsedData[key] = JSON.parse(value);
          } catch {
            parsedData[key] = value;
          }
        } else {
          parsedData[key] = value;
        }
      });

      return parsedData as T;
    } catch (error) {
      console.warn('Failed to get all data:', error);
      return {} as T;
    }
  }

  getKeys(): string[] {
    try {
      return ExpoTargetsStorageModule.getAllKeys(this.appGroup);
    } catch (error) {
      console.warn('Failed to get all keys:', error);
      return [];
    }
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

export function getTargetsConfigFromBundle(): any[] | null {
  try {
    return ExpoTargetsStorageModule.getTargetsConfig();
  } catch (error) {
    console.warn('Failed to read targets config from bundle:', error);
    return null;
  }
}
