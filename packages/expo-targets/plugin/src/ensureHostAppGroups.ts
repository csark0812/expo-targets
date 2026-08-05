import * as fs from 'node:fs';
import * as path from 'node:path';
import { withEntitlementsPlist } from '@expo/config-plugins';
import type { ExpoConfig } from '@expo/config-types';

import { getAppGroup } from './config';
import {
  APP_GROUP_ENTITLEMENT_KEY,
  requiresAppGroup,
  shouldUseAppGroups,
} from './domain';
import type { ExtensionType } from './domain/types';
import type { Logger } from './logger';

interface EvaluatedTarget {
  config: {
    type?: ExtensionType;
    platforms?: string[];
    entry?: string;
  };
}

export function targetNeedsAppGroup(type: ExtensionType | undefined): boolean {
  if (!type) {
    return false;
  }
  return requiresAppGroup(type) || shouldUseAppGroups(type);
}

export function anyTargetNeedsAppGroup(targets: EvaluatedTarget[]): boolean {
  return targets.some(
    (t) =>
      t.config.platforms?.includes('ios') && targetNeedsAppGroup(t.config.type)
  );
}

export function ensureHostAppGroups(
  config: ExpoConfig,
  targets: EvaluatedTarget[],
  logger: Logger
): ExpoConfig {
  if (!anyTargetNeedsAppGroup(targets)) {
    return config;
  }

  const existing = config.ios?.entitlements?.[APP_GROUP_ENTITLEMENT_KEY];
  if (Array.isArray(existing) && existing.length > 0) {
    return config;
  }

  const bundleId = config.ios?.bundleIdentifier;
  if (!bundleId) {
    return config;
  }

  const group = getAppGroup(bundleId);
  logger.log(`Invented App Group for host: ${group}`);

  let next: ExpoConfig = {
    ...config,
    ios: {
      ...config.ios,
      entitlements: {
        ...config.ios?.entitlements,
        [APP_GROUP_ENTITLEMENT_KEY]: [group],
      },
    },
  };

  next = withEntitlementsPlist(next, async (cfg) => {
    const entitlements = cfg.modResults;
    const current = entitlements[APP_GROUP_ENTITLEMENT_KEY];
    if (!Array.isArray(current) || current.length === 0) {
      entitlements[APP_GROUP_ENTITLEMENT_KEY] = [group];
      cfg.modResults = entitlements;
    }
    return cfg;
  });

  return next;
}

export function warnMissingMetroWrapper(
  projectRoot: string,
  targets: EvaluatedTarget[],
  logger: Logger
): void {
  const hasEntry = targets.some((t) => t.config.entry);
  if (!hasEntry) {
    return;
  }

  const metroPath = path.join(projectRoot, 'metro.config.js');
  if (!fs.existsSync(metroPath)) {
    logger.warn(
      'metro.config.js not found; wrap Metro with withTargets from expo-targets/metro'
    );
    return;
  }

  const content = fs.readFileSync(metroPath, 'utf8');
  if (
    !(content.includes('withTargets') || content.includes('withTargetsMetro'))
  ) {
    logger.warn(
      'metro.config.js does not use withTargets; extension entries may not resolve'
    );
  }
}
