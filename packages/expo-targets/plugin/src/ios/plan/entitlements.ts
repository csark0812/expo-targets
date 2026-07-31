import type { ExtensionType } from '../../domain';
import {
  APP_GROUP_ENTITLEMENT_KEY,
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
  appGroup,
  paths,
}: {
  type: ExtensionType;
  entitlements?: Record<string, any>;
  mainBundleIdentifier?: string;
  mainAppGroups?: string[];
  /** Explicit target `appGroup` — always written when present. */
  appGroup?: string;
  paths: {
    projectRoot: string;
    targetDirectory: string;
    buildSubdirectory?: string;
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

  if (shouldUseAppGroups(type)) {
    entitlements = Plist.syncAppGroups({
      targetEntitlements: entitlements,
      mainAppGroups,
    });
  }

  // Target-level appGroup wins even when the type does not default to syncing.
  if (appGroup) {
    const existing = entitlements[APP_GROUP_ENTITLEMENT_KEY];
    if (Array.isArray(existing)) {
      if (!existing.includes(appGroup)) {
        entitlements = {
          ...entitlements,
          [APP_GROUP_ENTITLEMENT_KEY]: [...existing, appGroup],
        };
      }
    } else {
      entitlements = {
        ...entitlements,
        [APP_GROUP_ENTITLEMENT_KEY]: [appGroup],
      };
    }
  }

  return {
    required,
    path: entitlementsPath,
    entitlements,
    syncedAppGroups: Boolean(entitlements[APP_GROUP_ENTITLEMENT_KEY]),
  };
}
