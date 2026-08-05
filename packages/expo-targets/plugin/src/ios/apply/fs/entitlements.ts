import plist from '@expo/plist';

import { warnIfSealedHandEdited } from '../../../codegen/warnIfSealedHandEdited';
import type { Logger } from '../../../logger';
import type { EntitlementsPlan } from '../../plan/types';
import * as Plist from '../../utils/plist';

/**
 * Write the target's entitlements file. Returns false for asset-only targets,
 * which do not get one.
 */
export function writeEntitlements(
  plan: EntitlementsPlan,
  { logger, targetDirectory }: { logger: Logger; targetDirectory: string }
): boolean {
  if (!plan.required) {
    return false;
  }

  const plannedContent = plist.build(plan.entitlements);
  warnIfSealedHandEdited({
    filePath: plan.path,
    plannedContent,
    logger,
    userDeepenPath: `${targetDirectory}/ios/`,
  });
  Plist.writePlist(plan.path, plan.entitlements);
  return true;
}
