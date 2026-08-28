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
    appGroup?: string;
    ios?: {
      entitlements?: Record<string, unknown>;
    };
  };
}

function addStringGroups(groups: Set<string>, values: unknown): void {
  if (!Array.isArray(values)) {
    return;
  }
  for (const group of values) {
    if (typeof group === 'string' && group.length > 0) {
      groups.add(group);
    }
  }
}

function targetHasExplicitAppGroup(target: EvaluatedTarget): boolean {
  if (typeof target.config.appGroup === 'string' && target.config.appGroup) {
    return true;
  }
  const configured =
    target.config.ios?.entitlements?.[APP_GROUP_ENTITLEMENT_KEY];
  return (
    Array.isArray(configured) &&
    configured.some((g) => typeof g === 'string' && g.length > 0)
  );
}

export function collectTargetAppGroups(targets: EvaluatedTarget[]): string[] {
  const groups = new Set<string>();
  for (const target of targets) {
    if (!target.config.platforms?.includes('ios')) {
      continue;
    }
    if (
      !(
        targetNeedsAppGroup(target.config.type) ||
        targetHasExplicitAppGroup(target)
      )
    ) {
      continue;
    }
    if (typeof target.config.appGroup === 'string' && target.config.appGroup) {
      groups.add(target.config.appGroup);
    }
    addStringGroups(
      groups,
      target.config.ios?.entitlements?.[APP_GROUP_ENTITLEMENT_KEY]
    );
  }
  return [...groups];
}

function uniqueGroups(groups: string[]): string[] {
  return [...new Set(groups.filter((g) => g.length > 0))];
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
      t.config.platforms?.includes('ios') &&
      (targetNeedsAppGroup(t.config.type) || targetHasExplicitAppGroup(t))
  );
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((g): g is string => typeof g === 'string');
}

function resolveMergedHostGroups(
  config: ExpoConfig,
  targets: EvaluatedTarget[],
  logger: Logger
): string[] | null {
  const existing = stringList(
    config.ios?.entitlements?.[APP_GROUP_ENTITLEMENT_KEY]
  );
  const fromTargets = collectTargetAppGroups(targets);
  let merged = uniqueGroups([...existing, ...fromTargets]);

  if (merged.length === 0) {
    const bundleId = config.ios?.bundleIdentifier;
    if (!bundleId) {
      return null;
    }
    const invented = getAppGroup(bundleId);
    logger.log(`Invented App Group for host: ${invented}`);
    return [invented];
  }

  for (const group of fromTargets) {
    if (!existing.includes(group)) {
      logger.log(`Union App Group into host: ${group}`);
    }
  }
  return merged;
}

function writeHostAppGroups(config: ExpoConfig, merged: string[]): ExpoConfig {
  let next: ExpoConfig = {
    ...config,
    ios: {
      ...config.ios,
      entitlements: {
        ...config.ios?.entitlements,
        [APP_GROUP_ENTITLEMENT_KEY]: merged,
      },
    },
  };

  next = withEntitlementsPlist(next, async (cfg) => {
    const entitlements = cfg.modResults;
    entitlements[APP_GROUP_ENTITLEMENT_KEY] = uniqueGroups([
      ...stringList(entitlements[APP_GROUP_ENTITLEMENT_KEY]),
      ...merged,
    ]);
    cfg.modResults = entitlements;
    return cfg;
  });

  return next;
}

export function ensureHostAppGroups(
  config: ExpoConfig,
  targets: EvaluatedTarget[],
  logger: Logger
): ExpoConfig {
  if (!anyTargetNeedsAppGroup(targets)) {
    return config;
  }

  const existing = stringList(
    config.ios?.entitlements?.[APP_GROUP_ENTITLEMENT_KEY]
  );
  const merged = resolveMergedHostGroups(config, targets, logger);
  if (!merged) {
    return config;
  }
  const same =
    merged.length === existing.length &&
    merged.every((g, i) => g === existing[i]);
  if (same) {
    return config;
  }

  return writeHostAppGroups(config, merged);
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
