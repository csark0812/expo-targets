import { warnIfSealedHandEdited } from '../../../codegen/warnIfSealedHandEdited';
import type { Logger } from '../../../logger';
import type { SafariResourcesPlan } from '../../plan/types';
import * as File from '../../utils/file';
import * as Safari from '../../utils/safari';

function warnGeneratedSafariFiles(
  plan: SafariResourcesPlan,
  logger: Logger
): void {
  const deepenPath = `${plan.targetDirectory}/ios/`;
  const planned = Safari.plannedSafariOverwriteFiles(plan.resourcesPath, {
    name: plan.name,
    displayName: plan.displayName,
    manifest: plan.manifest as Safari.SafariManifestConfig | undefined,
  });
  for (const { filePath, content } of planned) {
    warnIfSealedHandEdited({
      filePath,
      plannedContent: content,
      logger,
      userDeepenPath: deepenPath,
    });
  }
}

/**
 * Put the Safari web extension `Resources` folder in the build directory,
 * either by copying the user's folder or by generating the default one.
 */
export function applySafariResourcesPlan(
  plan: SafariResourcesPlan,
  { logger }: { logger: Logger }
): void {
  if (plan.useCustomResources) {
    File.copyDirectorySafe(plan.userResourcesPath, plan.resourcesPath);
    return;
  }

  warnGeneratedSafariFiles(plan, logger);
  Safari.generateSafariResources(plan.resourcesPath, {
    name: plan.name,
    displayName: plan.displayName,
    manifest: plan.manifest as Safari.SafariManifestConfig | undefined,
  });
}
