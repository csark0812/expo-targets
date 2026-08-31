import { withInfoPlist } from '@expo/config-plugins';
import type { ExpoConfig } from '@expo/config-types';

import type { IosKindSource } from './ios/utils/resolveIosKinds';
import { resolveLiveActivityConfigs } from './ios/utils/resolveIosKinds';
import type { Logger } from './logger';

export const NS_SUPPORTS_LIVE_ACTIVITIES = 'NSSupportsLiveActivities';

interface EvaluatedTarget {
  config: {
    platforms?: string[];
    ios?: IosKindSource;
  };
}

export function anyTargetNeedsHostLiveActivities(
  targets: EvaluatedTarget[]
): boolean {
  return targets.some(
    (target) =>
      Boolean(target.config.platforms?.includes('ios')) &&
      resolveLiveActivityConfigs(target.config).length > 0
  );
}

function writeHostLiveActivitiesSupport(config: ExpoConfig): ExpoConfig {
  let next: ExpoConfig = {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        [NS_SUPPORTS_LIVE_ACTIVITIES]: true,
      },
    },
  };

  next = withInfoPlist(next, (cfg) => {
    cfg.modResults[NS_SUPPORTS_LIVE_ACTIVITIES] = true;
    return cfg;
  });

  return next;
}

export function ensureHostLiveActivities(
  config: ExpoConfig,
  targets: EvaluatedTarget[],
  logger: Logger
): ExpoConfig {
  if (!anyTargetNeedsHostLiveActivities(targets)) {
    return config;
  }

  if (config.ios?.infoPlist?.[NS_SUPPORTS_LIVE_ACTIVITIES] !== true) {
    logger.log('Set host NSSupportsLiveActivities=true');
  }

  return writeHostLiveActivitiesSupport(config);
}
