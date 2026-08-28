import { TYPE_CHARACTERISTICS } from './characteristics';
import type { ExtensionType } from './types';

export const APP_GROUP_ENTITLEMENT_KEY =
  'com.apple.security.application-groups';

/**
 * Whether a type gets the main app's App Groups synced into its entitlements.
 */
export function shouldUseAppGroups(type: ExtensionType): boolean {
  return TYPE_CHARACTERISTICS[type].defaultUsesAppGroups;
}

/**
 * Types that cannot build without an App Group. This is the historical
 * "required" set — a strict subset of the types that default to App Groups.
 * App Clips are opt-in: they share nothing unless the target lists a group.
 */
export const REQUIRES_APP_GROUP_TYPES: ExtensionType[] = [
  'widget',
  'share',
  'bg-download',
];

/**
 * Resolve the App Groups list for a target. An empty configured array omits
 * the entitlement (no host copy). A real `appGroup` or non-empty list wins.
 */
export function resolveApplicationGroups({
  configured,
  appGroup,
  mainAppGroups,
  inheritHost,
}: {
  configured: unknown;
  appGroup?: string;
  mainAppGroups?: unknown;
  inheritHost: boolean;
}): string[] | undefined {
  if (Array.isArray(configured)) {
    const groups = configured.filter(
      (g): g is string => typeof g === 'string' && g.length > 0
    );
    return groups.length > 0 ? groups : undefined;
  }
  if (typeof appGroup === 'string' && appGroup.length > 0) {
    return [appGroup];
  }
  if (inheritHost && Array.isArray(mainAppGroups) && mainAppGroups.length > 0) {
    return mainAppGroups.filter(
      (g): g is string => typeof g === 'string' && g.length > 0
    );
  }
}

export function omitEmptyApplicationGroups<T extends Record<string, unknown>>(
  entitlements: T
): T {
  const value = entitlements[APP_GROUP_ENTITLEMENT_KEY];
  if (!Array.isArray(value) || value.length > 0) {
    return entitlements;
  }
  const next = { ...entitlements };
  delete next[APP_GROUP_ENTITLEMENT_KEY];
  return next;
}

export function requiresAppGroup(type: ExtensionType): boolean {
  return REQUIRES_APP_GROUP_TYPES.includes(type);
}

/**
 * Types whose EAS credentials can carry App Groups. Wider than
 * `shouldUseAppGroups` on purpose: missing capabilities break builds when a
 * user hand-configures App Groups. Clips still omit unless they list a group.
 */
export const EAS_APP_GROUP_TYPES: ExtensionType[] = [
  'widget',
  'clip',
  'share',
  'bg-download',
  'messages',
  'action',
  'notification-service',
  'notification-content',
  'intent',
  'intent-ui',
];
