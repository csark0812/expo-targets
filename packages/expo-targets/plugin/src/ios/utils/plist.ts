import plist from '@expo/plist';
import type { ExtensionType } from '../../config';
import { shouldUseAppGroups as domainShouldUseAppGroups } from '../../domain/appGroups';
import * as FileUtils from './file';

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
  const AppGroupKey = 'com.apple.security.application-groups';
  const configured = targetEntitlements[AppGroupKey];

  if (Array.isArray(configured) && configured.length === 0) {
    const { [AppGroupKey]: _omitted, ...rest } = targetEntitlements;
    return rest;
  }

  if (!configured && Array.isArray(mainAppGroups) && mainAppGroups.length > 0) {
    return {
      ...targetEntitlements,
      [AppGroupKey]: mainAppGroups,
    };
  }

  return targetEntitlements;
}

/**
 * Check if a target type should use App Groups by default.
 * Delegates to the domain layer so the answer has a single source of truth.
 */
export function shouldUseAppGroups(type: ExtensionType): boolean {
  return domainShouldUseAppGroups(type);
}
