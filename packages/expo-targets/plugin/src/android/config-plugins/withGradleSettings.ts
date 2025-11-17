import { ConfigPlugin, withSettingsGradle } from '@expo/config-plugins';

import { AndroidTargetOptions } from './withAndroidTarget';

/**
 * Adds target module to settings.gradle
 */
export const withGradleSettings: ConfigPlugin<AndroidTargetOptions> = (
  config,
  options
) => {
  return withSettingsGradle(config, (config) => {
    const { modResults } = config;
    const { name } = options;

    const moduleInclude = `include ':${name}'`;
    const projectDir = `project(':${name}').projectDir = new File(rootProject.projectDir, '${name}')`;

    // Check if already added
    if (!modResults.contents.includes(moduleInclude)) {
      // Add at the end
      modResults.contents += `\n// Added by expo-targets\n${moduleInclude}\n${projectDir}\n`;
    }

    return config;
  });
};

