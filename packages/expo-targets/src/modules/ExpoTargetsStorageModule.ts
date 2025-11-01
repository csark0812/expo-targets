import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

const NativeModule = requireNativeModule('ExpoTargetsStorage');

// Cross-platform wrapper for widget storage
// iOS uses appGroup (suite), Android uses widgetName
const ExpoTargetsStorageModule = {
  async set(widgetName: string, key: string, value: string): Promise<boolean> {
    if (Platform.OS === 'ios') {
      // For iOS, use the widget name as the suite name (appGroup should be configured)
      // The widget will read from the same appGroup
      await NativeModule.setString(key, value, `group.${widgetName}`);
      return true;
    } else if (Platform.OS === 'android') {
      // Android module signature: set(widgetName, key, value)
      return await NativeModule.set(widgetName, key, value);
    }
    return false;
  },

  async get(widgetName: string, key: string): Promise<string | null> {
    if (Platform.OS === 'ios') {
      return await NativeModule.get(key, `group.${widgetName}`);
    } else if (Platform.OS === 'android') {
      // Android module signature: get(widgetName, key)
      return await NativeModule.get(widgetName, key);
    }
    return null;
  },

  async remove(widgetName: string, key: string): Promise<boolean> {
    if (Platform.OS === 'ios') {
      await NativeModule.remove(key, `group.${widgetName}`);
      return true;
    } else if (Platform.OS === 'android') {
      // Android module signature: remove(widgetName, key)
      return await NativeModule.remove(widgetName, key);
    }
    return false;
  },
};

export default ExpoTargetsStorageModule;
