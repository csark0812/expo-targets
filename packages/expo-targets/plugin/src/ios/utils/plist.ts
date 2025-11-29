import plist from '@expo/plist';

import * as FileUtils from './file';
import type { ExtensionType } from '../../config';

/**
 * Plist file manipulation utilities.
 * Provides high-level helpers for working with plist files.
 */

/**
 * Write a plist file from an object.
 */
export function writePlist(filePath: string, data: Record<string, any>): void {
  const plistContent = plist.build(data);
  FileUtils.writeFileSafe(filePath, plistContent);
}

/**
 * Read a plist file into an object.
 */
export function readPlist(filePath: string): Record<string, any> {
  const content = FileUtils.readFileIfExists(filePath);
  if (!content) {
    throw new Error(`Plist file not found: ${filePath}`);
  }
  return plist.parse(content);
}

/**
 * Merge entitlements with App Clip specific requirements.
 */
export function mergeAppClipEntitlements(
  entitlements: Record<string, any>,
  mainBundleIdentifier: string
): Record<string, any> {
  return {
    ...entitlements,
    'com.apple.developer.parent-application-identifiers': [
      `$(AppIdentifierPrefix)${mainBundleIdentifier}`,
    ],
    'com.apple.developer.on-demand-install-capable': true,
  };
}

/**
 * Sync App Groups from main app to target entitlements.
 */
export function syncAppGroups({
  targetEntitlements,
  mainAppGroups,
}: {
  targetEntitlements: Record<string, any>;
  mainAppGroups: string[] | undefined;
}): Record<string, any> {
  const APP_GROUP_KEY = 'com.apple.security.application-groups';

  if (
    !targetEntitlements[APP_GROUP_KEY] &&
    Array.isArray(mainAppGroups) &&
    mainAppGroups.length > 0
  ) {
    return {
      ...targetEntitlements,
      [APP_GROUP_KEY]: mainAppGroups,
    };
  }

  return targetEntitlements;
}

/**
 * Check if a target type should use App Groups by default.
 */
export function shouldUseAppGroups(type: ExtensionType): boolean {
  const SHOULD_USE_APP_GROUPS_BY_DEFAULT: Record<ExtensionType, boolean> = {
    widget: true,
    clip: true,
    share: true,
    'bg-download': true,
    stickers: false,
    messages: true,
    action: false,
    safari: false,
    'notification-content': false,
    'notification-service': false,
    intent: false,
    'intent-ui': false,
    spotlight: false,
    'quicklook-thumbnail': false,
    'location-push': false,
    'credentials-provider': false,
    'account-auth': false,
    'app-intent': false,
    'device-activity-monitor': false,
    matter: false,
    watch: false,
    wallet: false,
  };

  return SHOULD_USE_APP_GROUPS_BY_DEFAULT[type];
}
