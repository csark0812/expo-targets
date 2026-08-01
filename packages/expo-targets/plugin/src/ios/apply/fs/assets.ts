import type { AssetPlan } from '../../plan/types';
import * as Asset from '../../utils/asset';
import * as File from '../../utils/file';

/**
 * Materialize the target's asset catalog in the build directory: copy the
 * user's catalog when present, then write the generated color sets.
 */
export function applyAssetPlan(plan: AssetPlan): void {
  if (plan.copyUserAssets) {
    File.copyDirectorySafe(plan.userAssetsPath, plan.buildAssetsPath);
  } else {
    File.ensureDirectoryExists(plan.buildAssetsPath);
    Asset.createAssetsXcassetsRoot(plan.buildAssetsPath);
  }

  for (const colorset of plan.colorsets) {
    Asset.createColorset({
      colorsetPath: colorset.colorsetPath,
      color: colorset.color,
      darkColor: colorset.darkColor,
    });
  }
}
