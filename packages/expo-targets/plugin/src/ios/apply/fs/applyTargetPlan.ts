import fs from 'node:fs';
import path from 'node:path';

import type { Logger } from '../../../logger';
import type { XcodeTargetPlan } from '../../plan/types';
import * as File from '../../utils/file';
import * as Paths from '../../utils/paths';
import { applyAssetPlan } from './assets';
import { writeInfoPlist } from './infoPlist';
import { applySafariResourcesPlan } from './safari';
import { applyStickersPlan } from './stickers';
import { applySwiftFilePlans } from './swift';

/**
 * Write everything the plan owns on disk, in the order the Xcode project
 * expects it: generated metadata first, user-facing catalogs last (a copied
 * user catalog must win over generated placeholders).
 */
export function applyFsTargetPlan(
  plan: XcodeTargetPlan,
  { logger }: { logger: Logger }
): void {
  const { workspace } = plan;

  File.ensureDirectoryExists(workspace.targetBuildPath);
  logger.log(
    `Build directory: ${path.relative(workspace.projectRoot, workspace.targetBuildPath)}`
  );

  // Soft migration: remove legacy targets/<name>/ios/build if still present.
  const legacyBuildPath = Paths.getLegacyTargetBuildPath({
    projectRoot: workspace.projectRoot,
    targetDirectory: workspace.directory,
  });
  if (fs.existsSync(legacyBuildPath)) {
    fs.rmSync(legacyBuildPath, { recursive: true, force: true });
    logger.log(
      `Removed legacy build directory: ${path.relative(workspace.projectRoot, legacyBuildPath)}`
    );
  }

  writeInfoPlist(plan.infoPlist);
  logger.log(
    `Generated Info.plist at ${path.relative(workspace.projectRoot, plan.infoPlist.path)}`
  );

  if (plan.assets.stickers) {
    applyStickersPlan(plan.assets.stickers, logger);
    logger.log(`Created iMessage App Icon set for ${plan.identity.targetName}`);
  }

  if (plan.safari) {
    applySafariResourcesPlan(plan.safari, { logger });
    logger.log(
      `${plan.safari.useCustomResources ? 'Copied custom' : 'Generated'} Safari Resources at ${path.relative(
        workspace.projectRoot,
        plan.safari.resourcesPath
      )}`
    );
  }

  applySwiftFilePlans(plan.swiftFiles, {
    projectRoot: workspace.projectRoot,
    logger,
    targetDirectory: workspace.directory,
  });
  logger.log(`Prepared ${plan.swiftFiles.length} Swift file(s)`);

  applyAssetPlan(plan.assets);
  if (plan.assets.colorsets.length > 0) {
    logger.log(`Generated ${plan.assets.colorsets.length} color assets`);
  }
}
