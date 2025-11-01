import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

const NativeModule = requireNativeModule('ExpoTargetsStorage');

/**
 * Cross-platform wrapper for ExpoTargetsStorage native module.
 * Provides unified API that works on both iOS and Android.
 *
 * iOS uses appGroup (suite) parameter, Android uses widgetName parameter.
 * This wrapper handles the platform differences transparently.
 */
const ExpoTargetsStorageModule = {
  /**
   * Set an integer value
   */
  async setInt(key: string, value: number, storageKey: string): Promise<void> {
    if (Platform.OS === 'ios') {
      await NativeModule.setInt(key, Math.floor(value), storageKey);
    } else if (Platform.OS === 'android') {
      // Android module signature: setInt(key, value, widgetName)
      await NativeModule.setInt(key, Math.floor(value), storageKey);
    }
  },

  /**
   * Set a string value
   */
  async setString(
    key: string,
    value: string,
    storageKey: string
  ): Promise<void> {
    if (Platform.OS === 'ios') {
      await NativeModule.setString(key, value, storageKey);
    } else if (Platform.OS === 'android') {
      // Android module signature: setString(key, value, widgetName)
      await NativeModule.setString(key, value, storageKey);
    }
  },

  /**
   * Set an object value (serialized as JSON)
   */
  async setObject(
    key: string,
    value: Record<string, any>,
    storageKey: string
  ): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return await NativeModule.setObject(key, value, storageKey);
    } else if (Platform.OS === 'android') {
      // Android module signature: setObject(key, value, widgetName)
      return await NativeModule.setObject(key, value, storageKey);
    }
    return false;
  },

  /**
   * Get a value by key
   */
  async get(key: string, storageKey: string): Promise<string | null> {
    if (Platform.OS === 'ios') {
      return await NativeModule.get(key, storageKey);
    } else if (Platform.OS === 'android') {
      // Android module signature: get(key, widgetName)
      return await NativeModule.get(key, storageKey);
    }
    return null;
  },

  /**
   * Remove a value by key
   */
  async remove(key: string, storageKey: string): Promise<void> {
    if (Platform.OS === 'ios') {
      await NativeModule.remove(key, storageKey);
    } else if (Platform.OS === 'android') {
      // Android module signature: remove(key, widgetName)
      await NativeModule.remove(key, storageKey);
    }
  },

  /**
   * Get all keys for a storage
   */
  async getAllKeys(storageKey: string): Promise<string[]> {
    if (Platform.OS === 'ios') {
      return await NativeModule.getAllKeys(storageKey);
    } else if (Platform.OS === 'android') {
      // Android module signature: getAllKeys(widgetName)
      return await NativeModule.getAllKeys(storageKey);
    }
    return [];
  },

  /**
   * Get all data for a storage
   */
  async getAllData(storageKey: string): Promise<Record<string, any>> {
    if (Platform.OS === 'ios') {
      return await NativeModule.getAllData(storageKey);
    } else if (Platform.OS === 'android') {
      // Android module signature: getAllData(widgetName)
      return await NativeModule.getAllData(storageKey);
    }
    return {};
  },

  /**
   * Clear all data for a storage
   */
  async clearAll(storageKey: string): Promise<void> {
    if (Platform.OS === 'ios') {
      await NativeModule.clearAll(storageKey);
    } else if (Platform.OS === 'android') {
      // Android module signature: clearAll(widgetName)
      await NativeModule.clearAll(storageKey);
    }
  },

  /**
   * Refresh a target/widget
   * On iOS: Synchronous call to WidgetCenter.reloadTimelines/ControlCenter.reloadControls
   * On Android: Async call that triggers BroadcastReceiver
   */
  async refreshTarget(targetName: string | undefined): Promise<void> {
    if (Platform.OS === 'ios') {
      // iOS native module Function (synchronous) - but we keep async for consistency
      NativeModule.refreshTarget(targetName);
    } else if (Platform.OS === 'android') {
      // Android module signature: refreshTarget(targetName) - AsyncFunction
      await NativeModule.refreshTarget(targetName);
    }
  },

  /**
   * Get targets config from bundle (iOS only)
   * Note: iOS native module supports synchronous calls, so this can be sync
   */
  getTargetsConfig(): any[] | null {
    if (Platform.OS === 'ios') {
      // iOS native module Function (not AsyncFunction) supports sync calls
      return NativeModule.getTargetsConfig();
    }
    // Android doesn't have Info.plist equivalent
    return null;
  },
};

export default ExpoTargetsStorageModule;
