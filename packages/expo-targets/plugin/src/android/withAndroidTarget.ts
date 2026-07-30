import type { ConfigPlugin } from '@expo/config-plugins';
import type { TargetConfig } from '../config';
import { withAndroidWidget } from './withAndroidWidget';

/**
 * Main orchestrator for Android target configuration.
 * Routes to specific implementation based on target type.
 */
export const withAndroidTarget: ConfigPlugin<
  TargetConfig & { directory: string }
> = (config, targetConfig) => {
  if (!targetConfig.platforms?.includes('android')) {
    return config;
  }

  switch (targetConfig.type) {
    case 'widget':
      return withAndroidWidget(config, targetConfig);
    default:
      return config;
  }
};
