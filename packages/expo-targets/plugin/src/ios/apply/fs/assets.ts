import fs from 'node:fs';
import path from 'node:path';

import type { Logger } from '../../../logger';
import type { AssetPlan, ImagesetPlan } from '../../plan/types';
import * as Asset from '../../utils/asset';
import * as File from '../../utils/file';

function scaleSibling(sourcePath: string, scale: '2x' | '3x'): string {
  const ext = path.extname(sourcePath);
  const base = path.basename(sourcePath, ext);
  return path.join(path.dirname(sourcePath), `${base}@${scale}${ext}`);
}

function collectScaleFiles(sourcePath: string): {
  scale: '1x' | '2x' | '3x';
  sourcePath: string;
  filename: string;
}[] {
  const files: {
    scale: '1x' | '2x' | '3x';
    sourcePath: string;
    filename: string;
  }[] = [{ scale: '1x', sourcePath, filename: path.basename(sourcePath) }];

  for (const scale of ['2x', '3x'] as const) {
    const sibling = scaleSibling(sourcePath, scale);
    if (File.isFile(sibling)) {
      files.push({
        scale,
        sourcePath: sibling,
        filename: path.basename(sibling),
      });
    }
  }

  return files;
}

function isVectorAsset(sourcePath: string): boolean {
  const ext = path.extname(sourcePath).toLowerCase();
  return ext === '.svg' || ext === '.pdf';
}

function userOwnsImageset(assets: AssetPlan, name: string): boolean {
  return (
    assets.copyUserAssets &&
    File.isDirectory(path.join(assets.userAssetsPath, `${name}.imageset`))
  );
}

function applyImagesetPlan(
  plan: ImagesetPlan,
  assets: AssetPlan,
  logger?: Logger
): boolean {
  if (userOwnsImageset(assets, plan.name)) {
    return false;
  }
  if (!File.isFile(plan.sourcePath)) {
    logger?.warn(`Image asset not found: ${plan.sourcePath}`);
    return false;
  }

  if (File.isDirectory(plan.imagesetPath)) {
    fs.rmSync(plan.imagesetPath, { recursive: true, force: true });
  }

  const files = collectScaleFiles(plan.sourcePath);
  for (const file of files) {
    File.copyFileSafe(
      file.sourcePath,
      path.join(plan.imagesetPath, file.filename)
    );
  }

  const vector = isVectorAsset(plan.sourcePath);
  Asset.createImageset({
    imagesetPath: plan.imagesetPath,
    files: files.map(({ scale, filename }) => ({ scale, filename })),
    template: vector,
    preservesVector: vector,
  });
  return true;
}

/**
 * Materialize the target's asset catalog in the build directory: copy the
 * user's catalog when present, then write generated color sets and imagesets.
 * An existing user imageset of the same name is left in place.
 */
export function applyAssetPlan(plan: AssetPlan, logger?: Logger): void {
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

  let generatedImages = 0;
  for (const imageset of plan.imagesets) {
    if (applyImagesetPlan(imageset, plan, logger)) {
      generatedImages += 1;
    }
  }
  if (generatedImages > 0) {
    logger?.log(`Generated ${generatedImages} image assets`);
  }
}
