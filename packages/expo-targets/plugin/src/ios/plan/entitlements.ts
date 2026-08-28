import type { ExtensionType } from '../../domain';
import {
  APP_GROUP_ENTITLEMENT_KEY,
  omitEmptyApplicationGroups,
  shouldUseAppGroups,
  TYPE_CHARACTERISTICS,
} from '../../domain';
import * as Paths from '../utils/paths';
import * as Plist from '../utils/plist';
import type { EntitlementsPlan } from './types';

/**
 * Plan the target's `generated.entitlements` contents.
 *
 * Asset-only targets get `required: false` and are skipped by the applier.
 */
export function planEntitlements({
  type,
  entitlements: configured,
  mainBundleIdentifier,
  mainAppGroups,
  paths,
}: {
  type: ExtensionType;
  entitlements?: Record<string, any>;
  mainBundleIdentifier?: string;
  mainAppGroups?: string[];
  paths: {
    platformProjectRoot: string;
    projectName: string;
    productName: string;
  };
}): EntitlementsPlan {
  const entitlementsPath = Paths.getTargetEntitlementsPath(paths);
  const required = TYPE_CHARACTERISTICS[type].requiresEntitlements;

  if (!required) {
    return {
      required,
      path: entitlementsPath,
      entitlements: {},
      syncedAppGroups: false,
    };
  }

  let entitlements: Record<string, any> = { ...(configured || {}) };

  if (type === 'clip' && mainBundleIdentifier) {
    entitlements = Plist.mergeAppClipEntitlements(
      entitlements,
      mainBundleIdentifier
    );
  }

  // Payment pass provisioning is a restricted capability; it is written to the
  // entitlements file but never sent to EAS credentials.
  if (type === 'wallet' || type === 'wallet-ui') {
    entitlements['com.apple.developer.payment-pass-provisioning'] = true;
  }

  const syncsAppGroups =
    shouldUseAppGroups(type) &&
    Array.isArray(mainAppGroups) &&
    mainAppGroups.length > 0;

  if (shouldUseAppGroups(type)) {
    entitlements = Plist.syncAppGroups({
      targetEntitlements: entitlements,
      mainAppGroups,
    });
  }

  entitlements = omitEmptyApplicationGroups(entitlements);

  return {
    required,
    path: entitlementsPath,
    entitlements,
    syncedAppGroups: Boolean(
      syncsAppGroups && entitlements[APP_GROUP_ENTITLEMENT_KEY]
    ),
  };
}
