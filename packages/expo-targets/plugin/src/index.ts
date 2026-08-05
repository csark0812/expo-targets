import type { ConfigPlugin } from '@expo/config-plugins';

import { withAndroidAppBuildGradle } from './android/withAndroidAppBuildGradle';
import { withExpoTargetsGenerated } from './ios/cng/withExpoTargetsGenerated';
import { withTargetsDir } from './withTargetsDir';

export type { ExpoConfig } from '@expo/config-types';
// Export types for use in config files
export type {
  AppIntentHostConfig,
  AppShortcutConfig,
  LiveActivityConfig,
  TargetConfig,
  TargetConfigFunction,
} from './config';

const withExpoTargets: ConfigPlugin<{
  debug?: boolean;
  targetsRoot?: string;
}> = (config, options) => {
  // Register CNG xcodeproj wiring *before* withTargetsDir so it runs *after*
  // extension targets exist (Expo mod interception is LIFO). Plans read
  // config.extra.targets at mod time (populated by withTargetsDir at compose).
  config = withExpoTargetsGenerated(config);
  config = withTargetsDir(config, options || {});
  config = withAndroidAppBuildGradle(config);
  return config;
};

export default withExpoTargets;
