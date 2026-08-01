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
 */
export const REQUIRES_APP_GROUP_TYPES: ExtensionType[] = [
  'widget',
  'clip',
  'share',
  'bg-download',
];

export function requiresAppGroup(type: ExtensionType): boolean {
  return REQUIRES_APP_GROUP_TYPES.includes(type);
}

/**
 * Types whose EAS credentials should carry App Groups. Wider than
 * `shouldUseAppGroups` on purpose: extra capabilities are harmless, missing
 * ones break builds when a user hand-configures App Groups.
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
