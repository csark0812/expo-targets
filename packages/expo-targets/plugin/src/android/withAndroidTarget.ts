import type { ConfigPlugin } from '@expo/config-plugins';
import type { TargetConfig } from '../config';
import { withAndroidTargetSourceSets } from './targetSourceSets';
import { withAndroidNotification } from './withAndroidNotification';
import { withAndroidShareAction } from './withAndroidShareAction';
import { withAndroidSystemService } from './withAndroidSystemService';
import { withAndroidWidget } from './withAndroidWidget';

/**
 * Main orchestrator for Android target configuration.
 * Routes to type-specific plugins; always merges per-target android/
 * source sets when present (Wave 0+).
 */
export const withAndroidTarget: ConfigPlugin<
  TargetConfig & { directory: string }
> = (config, targetConfig) => {
  if (!targetConfig.platforms?.includes('android')) {
    return config;
  }

  let next = withAndroidTargetSourceSets(config, {
    directory: targetConfig.directory,
  });

  switch (targetConfig.type) {
    case 'widget':
      return withAndroidWidget(next, targetConfig);
    case 'share':
    case 'action':
      return withAndroidShareAction(next, targetConfig);
    case 'notification-service':
    case 'notification-content':
      return withAndroidNotification(next, targetConfig);
    case 'file-provider':
    case 'file-provider-ui':
    case 'credentials-provider':
    case 'keyboard':
    case 'call-directory':
    case 'print-service':
    case 'network-packet-tunnel':
      return withAndroidSystemService(next, targetConfig);
    default:
      return next;
  }
};
