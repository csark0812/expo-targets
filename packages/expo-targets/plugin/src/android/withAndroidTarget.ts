import { ConfigPlugin } from '@expo/config-plugins';

import { withAndroidWidget } from './withAndroidWidget';
import { withAndroidShareExtension } from './withAndroidShareExtension';
import type { TargetConfig } from '../config';

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
    case 'share':
      return withAndroidShareExtension(config, targetConfig);
    case 'action':
      // Action extensions on Android work similarly to share extensions
      // Use same implementation for now
      return withAndroidShareExtension(config, targetConfig);
    default:
      console.warn(
        `[expo-targets] Android support for ${targetConfig.type} not yet available`
      );
      return config;
  }
};
