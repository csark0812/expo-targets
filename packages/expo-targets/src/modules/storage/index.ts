import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

const ExpoTargetsStorageModule = requireNativeModule('ExpoTargetsStorage');

export class AppGroupStorage {
  constructor(private readonly appGroup: string) {}
  
  // On Android, use widgetName (appGroup) directly; on iOS, use appGroup as suite
  private getStorageKey(): string {
    return this.appGroup;
  }

  set(key: string, value: any) {
    const storageKey = this.getStorageKey();
    if (value === null || value === undefined) {
      ExpoTargetsStorageModule.remove(key, storageKey);
    } else if (typeof value === 'number') {
      ExpoTargetsStorageModule.setInt(key, Math.floor(value), storageKey);
    } else if (typeof value === 'string') {
      ExpoTargetsStorageModule.setString(key, value, storageKey);
    } else if (typeof value === 'boolean') {
      ExpoTargetsStorageModule.setInt(key, value ? 1 : 0, storageKey);
    } else if (Array.isArray(value)) {
      ExpoTargetsStorageModule.setString(
        key,
        JSON.stringify(value),
        storageKey
      );
    } else {
      ExpoTargetsStorageModule.setString(
        key,
        JSON.stringify(value),
        storageKey
      );
    }
  }

  get<T = any>(key: string): T | null {
    try {
      const storageKey = this.getStorageKey();
      const value = ExpoTargetsStorageModule.get(key, storageKey);
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
    const storageKey = this.getStorageKey();
    ExpoTargetsStorageModule.remove(key, storageKey);
  }

  clear() {
    const storageKey = this.getStorageKey();
    ExpoTargetsStorageModule.clearAll(storageKey);
  }

  setData(data: Record<string, any>) {
    Object.entries(data).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  getData<T extends Record<string, any>>(): T {
    try {
      const storageKey = this.getStorageKey();
      const rawData = ExpoTargetsStorageModule.getAllData(storageKey);
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
      const storageKey = this.getStorageKey();
      return ExpoTargetsStorageModule.getAllKeys(storageKey);
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
