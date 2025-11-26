import { ConfigPlugin } from '@expo/config-plugins';

import { withAndroidAppBuildGradle } from './android/withAndroidAppBuildGradle';
import { withTargetsDir } from './withTargetsDir';

// Export types for use in config files
export type { TargetConfig, TargetConfigFunction } from './config';
export type { ExpoConfig } from '@expo/config-types';

const withExpoTargets: ConfigPlugin<{
  debug?: boolean;
  targetsRoot?: string;
}> = (config, options) => {
  config = withTargetsDir(config, options || {});
  config = withAndroidAppBuildGradle(config);
  return config;
};

export default withExpoTargets;
