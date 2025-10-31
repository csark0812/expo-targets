import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

const ExpoTargetsExtensionModule = requireNativeModule('ExpoTargetsExtension');

export interface Capabilities {
  supportsGlance: boolean;
  platformVersion: number;
}

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
