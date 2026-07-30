import type { EntitlementsPlan } from '../../plan/types';
import * as Plist from '../../utils/plist';

/**
 * Write the target's entitlements file. Returns false for asset-only targets,
 * which do not get one.
 */
export function writeEntitlements(plan: EntitlementsPlan): boolean {
  if (!plan.required) {
    return false;
  }

  Plist.writePlist(plan.path, plan.entitlements);
  return true;
}
