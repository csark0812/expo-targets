import { ConfigPlugin } from '@expo/config-plugins';

import { withTargetsDir } from './withTargetsDir';

const withExpoTargets: ConfigPlugin = (config) => {
  config = withTargetsDir(config, {});
  return config;
};

export default withExpoTargets;
