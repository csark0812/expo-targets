import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

const ExpoTargetsExtensionModule = requireNativeModule('ExpoTargetsExtension');

/**
 * Platform capabilities interface
 */
export interface Capabilities {
  /** Whether the platform supports Glance (Android 13+) */
  supportsGlance: boolean;
  /** Platform version number (e.g., Android API level or iOS major version) */
  platformVersion: number;
}

/**
 * Main expo-targets API for querying platform capabilities
 */
export const ExpoTargets = {
  get capabilities(): Capabilities {
    if (Platform.OS === 'android') {
      return {
        supportsGlance: ExpoTargetsExtensionModule.supportsGlance ?? false,
        platformVersion: ExpoTargetsExtensionModule.platformVersion ?? 0,
      };
    }
    // iOS doesn't expose these capabilities yet
    return {
      supportsGlance: false,
      platformVersion: 0,
    };
  },
};
