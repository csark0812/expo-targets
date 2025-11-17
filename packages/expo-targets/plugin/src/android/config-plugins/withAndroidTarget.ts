import { ConfigPlugin } from '@expo/config-plugins';

import { withAndroidColors } from './withAndroidColors';
import { withAndroidManifest } from './withAndroidManifest';
import { withAndroidModule } from './withAndroidModule';
import { withAndroidResources } from './withAndroidResources';
import { withGradleModule } from './withGradleModule';
import { withGradleSettings } from './withGradleSettings';
import { Logger } from '../../logger';

export interface AndroidTargetOptions {
  type: string;
  name: string;
  displayName?: string;
  packageName: string;
  directory: string;
  configPath: string;
  logger: Logger;
  colors?: Record<string, { light: string; dark: string }>;
  minSdkVersion?: number;
  targetSdkVersion?: number;
  updatePeriodMillis?: number;
  resizeMode?: string;
  widgetCategory?: string;
  useGlance?: boolean;
  permissions?: string[];
}

/**
 * Main orchestrator for Android target configuration
 * Applies all necessary modifications for a single target
 */
export const withAndroidTarget: ConfigPlugin<AndroidTargetOptions> = (
  config,
  options
) => {
  const { logger, name, type } = options;

  logger.log(`Configuring Android target: ${name} (${type})`);

  // Apply plugins in order
  config = withGradleSettings(config, options);
  config = withGradleModule(config, options);
  config = withAndroidModule(config, options);
  config = withAndroidResources(config, options);
  config = withAndroidColors(config, options);
  config = withAndroidManifest(config, options);

  logger.logSparse(true, `Configured target | ${options.displayName || name}`);

  return config;
};
