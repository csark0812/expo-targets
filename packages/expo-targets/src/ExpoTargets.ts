import ExpoTargetsExtensionModule from './modules/ExpoTargetsExtensionModule';

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
    return {
      supportsGlance: ExpoTargetsExtensionModule.supportsGlance,
      platformVersion: ExpoTargetsExtensionModule.platformVersion,
    };
  },
};
