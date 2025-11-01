import ExpoTargetsStorageModule from './ExpoTargetsStorageModule';

export class AppGroupStorage {
  constructor(private readonly appGroup: string) {}
  
  // On Android, use widgetName (appGroup) directly; on iOS, use appGroup as suite
  // The wrapper module handles platform differences
  private getStorageKey(): string {
    return this.appGroup;
  }

  async set(key: string, value: any): Promise<void> {
    const storageKey = this.getStorageKey();
    if (value === null || value === undefined) {
      await ExpoTargetsStorageModule.remove(key, storageKey);
    } else if (typeof value === 'number') {
      await ExpoTargetsStorageModule.setInt(key, Math.floor(value), storageKey);
    } else if (typeof value === 'string') {
      await ExpoTargetsStorageModule.setString(key, value, storageKey);
    } else if (typeof value === 'boolean') {
      await ExpoTargetsStorageModule.setInt(key, value ? 1 : 0, storageKey);
    } else if (Array.isArray(value)) {
      await ExpoTargetsStorageModule.setString(
        key,
        JSON.stringify(value),
        storageKey
      );
    } else {
      await ExpoTargetsStorageModule.setString(
        key,
        JSON.stringify(value),
        storageKey
      );
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const storageKey = this.getStorageKey();
      const value = await ExpoTargetsStorageModule.get(key, storageKey);
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

  async remove(key: string): Promise<void> {
    const storageKey = this.getStorageKey();
    await ExpoTargetsStorageModule.remove(key, storageKey);
  }

  async clear(): Promise<void> {
    const storageKey = this.getStorageKey();
    await ExpoTargetsStorageModule.clearAll(storageKey);
  }

  async setData(data: Record<string, any>): Promise<void> {
    await Promise.all(
      Object.entries(data).map(([key, value]) => this.set(key, value))
    );
  }

  async getData<T extends Record<string, any>>(): Promise<T> {
    try {
      const storageKey = this.getStorageKey();
      const rawData = await ExpoTargetsStorageModule.getAllData(storageKey);
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

  async getKeys(): Promise<string[]> {
    try {
      const storageKey = this.getStorageKey();
      return await ExpoTargetsStorageModule.getAllKeys(storageKey);
    } catch (error) {
      console.warn('Failed to get all keys:', error);
      return [];
    }
  }

  async refresh(targetName?: string): Promise<void> {
    await ExpoTargetsStorageModule.refreshTarget(targetName);
  }
}

export async function refreshAllTargets(): Promise<void> {
  await ExpoTargetsStorageModule.refreshTarget(undefined);
}

export async function clearSharedData(appGroup: string): Promise<void> {
  const storage = new AppGroupStorage(appGroup);
  await storage.clear();
}

export async function getTargetsConfigFromBundle(): Promise<any[] | null> {
  try {
    return await ExpoTargetsStorageModule.getTargetsConfig();
  } catch (error) {
    console.warn('Failed to read targets config from bundle:', error);
    return null;
  }
}
