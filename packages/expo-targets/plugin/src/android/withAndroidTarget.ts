import { ConfigPlugin } from '@expo/config-plugins';
import { withAndroidWidget } from './withAndroidWidget';
import type { TargetConfig } from '../config';

/**
 * Main orchestrator for Android target configuration.
 * Routes to specific implementation based on target type.
 */
export const withAndroidTarget: ConfigPlugin<TargetConfig & { directory: string }> = (config, targetConfig) => {
  if (!targetConfig.platforms?.includes('android')) {
    return config;
  }
  
  switch (targetConfig.type) {
    case 'widget':
      return withAndroidWidget(config, targetConfig);
    default:
      console.warn(`[expo-targets] Android support for ${targetConfig.type} coming later`);
      return config;
  }
};
