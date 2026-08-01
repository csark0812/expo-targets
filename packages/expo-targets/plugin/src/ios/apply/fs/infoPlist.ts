import type { InfoPlistPlan } from '../../plan/types';
import * as File from '../../utils/file';

/**
 * Write the generated Info.plist into the target's build directory.
 */
export function writeInfoPlist(plan: InfoPlistPlan): void {
  File.writeFileSafe(plan.path, plan.contents);
}
