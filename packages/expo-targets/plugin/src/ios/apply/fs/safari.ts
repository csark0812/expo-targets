import type { SafariResourcesPlan } from '../../plan/types';
import * as File from '../../utils/file';
import * as Safari from '../../utils/safari';

/**
 * Put the Safari web extension `Resources` folder in the build directory,
 * either by copying the user's folder or by generating the default one.
 */
export function applySafariResourcesPlan(plan: SafariResourcesPlan): void {
  if (plan.useCustomResources) {
    File.copyDirectorySafe(plan.userResourcesPath, plan.resourcesPath);
    return;
  }

  Safari.generateSafariResources(plan.resourcesPath, {
    name: plan.name,
    displayName: plan.displayName,
    manifest: plan.manifest as Safari.SafariManifestConfig | undefined,
  });
}
