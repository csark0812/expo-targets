import { ConfigPlugin } from '@expo/config-plugins';

import { withTargetsDir } from './withTargetsDir';

// Export types for use in config files
export type { TargetConfig, TargetConfigFunction } from './config';
export type { ExpoConfig } from '@expo/config-types';

const withExpoTargets: ConfigPlugin = (config) => {
  config = withTargetsDir(config, {});
  return config;
};

export default withExpoTargets;
