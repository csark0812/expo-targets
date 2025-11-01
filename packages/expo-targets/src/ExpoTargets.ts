import ExpoTargetsExtensionModule from './modules/ExpoTargetsExtensionModule';

export interface Capabilities {
  supportsGlance: boolean;
  platformVersion: number;
}

export const ExpoTargets = {
  get capabilities(): Capabilities {
    return {
      supportsGlance: ExpoTargetsExtensionModule.supportsGlance,
      platformVersion: ExpoTargetsExtensionModule.platformVersion,
    };
  },
};
