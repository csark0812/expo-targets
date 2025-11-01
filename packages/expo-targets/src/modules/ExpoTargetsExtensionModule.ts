import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

const NativeModule = requireNativeModule('ExpoTargetsExtension');

/**
 * Cross-platform wrapper for ExpoTargetsExtension native module.
 * Provides unified API for widget/extension operations.
 */
const ExpoTargetsExtensionModule = {
  /**
   * Refresh a widget/target
   */
  async refresh(widgetName: string): Promise<boolean> {
    if (Platform.OS === 'ios') {
      // iOS uses refreshTarget which calls WidgetCenter.reloadTimelines
      await NativeModule.refreshTarget(widgetName);
      return true;
    } else if (Platform.OS === 'android') {
      // Android module signature: refresh(widgetName)
      return await NativeModule.refresh(widgetName);
    }
    return false;
  },

  /**
   * Check if Glance widgets are supported (Android 13+)
   */
  get supportsGlance(): boolean {
    if (Platform.OS === 'android') {
      return NativeModule.supportsGlance || false;
    }
    return false;
  },

  /**
   * Get platform version
   */
  get platformVersion(): number {
    if (Platform.OS === 'android') {
      return NativeModule.platformVersion || 0;
    }
    if (Platform.OS === 'ios') {
      return parseInt(Platform.Version as string, 10) || 0;
    }
    return 0;
  },
};

export default ExpoTargetsExtensionModule;
