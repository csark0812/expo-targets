import path from 'node:path';

import type { Color } from '../../config';
import type { TargetWorkspace } from '../observe/workspace';
import * as Paths from '../utils/paths';
import type {
  AssetPlan,
  ColorsetPlan,
  IOSTargetProps,
  ProjectPaths,
  StickerPackPlan,
  StickersPlan,
  TargetIdentity,
} from './types';

const IMESSAGE_APP_ICON = 'iMessage App Icon.stickersiconset';

function resolveProjectPath(projectRoot: string, filePath: string): string {
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(projectRoot, filePath);
}

function planColorsets({
  props,
  projectRoot,
}: {
  props: IOSTargetProps;
  projectRoot: string;
}): ColorsetPlan[] {
  return Object.entries(props.colors || {}).map(([name, value]) => {
    const colorsetPath = Paths.getTargetColorsetPath({
      projectRoot,
      targetDirectory: props.directory,
      colorName: name,
      buildSubdirectory: props.buildSubdirectory,
    });

    if (typeof value === 'string') {
      return { name, colorsetPath, color: value };
    }

    const color = value as Color;
    return {
      name,
      colorsetPath,
      color: (color.light || color.color) as string,
      darkColor: color.dark || color.darkColor,
    };
  });
}

function planStickerPacks({
  props,
  identity,
  paths,
}: {
  props: IOSTargetProps;
  identity: TargetIdentity;
  paths: ProjectPaths;
}): StickerPackPlan[] {
  return (props.stickerPacks || []).map((pack) => {
    const stickerPackPath = Paths.getStickerPackPath({
      platformProjectRoot: paths.platformProjectRoot,
      targetName: identity.targetName,
      stickerPackName: pack.name,
    });
    const assets = pack.assets.map((assetPath) => {
      const sourcePath = path.isAbsolute(assetPath)
        ? assetPath
        : path.join(paths.projectRoot, props.directory, assetPath);
      const filename = path.basename(assetPath);
      const baseName = path.basename(assetPath, path.extname(assetPath));

      return {
        sourcePath,
        filename,
        stickerPath: path.join(stickerPackPath, `${baseName}.sticker`),
      };
    });

    return { name: pack.name, stickerPackPath, assets, missingAssets: [] };
  });
}

function planStickers({
  props,
  identity,
  paths,
  buildAssetsPath,
}: {
  props: IOSTargetProps;
  identity: TargetIdentity;
  paths: ProjectPaths;
  buildAssetsPath: string;
}): StickersPlan {
  return {
    assetsPath: buildAssetsPath,
    iconsetPath: path.join(buildAssetsPath, IMESSAGE_APP_ICON),
    sourceIconPath: props.targetIcon
      ? resolveProjectPath(paths.projectRoot, props.targetIcon)
      : undefined,
    packs: planStickerPacks({ props, identity, paths }),
  };
}

/**
 * Plan the target's asset catalog: which user assets to copy into the build
 * directory, which color sets to generate, and (for stickers) the sticker packs.
 */
export function planAssets({
  workspace,
  props,
  identity,
  paths,
}: {
  workspace: TargetWorkspace;
  props: IOSTargetProps;
  identity: TargetIdentity;
  paths: ProjectPaths;
}): AssetPlan {
  const isStickers = props.type === 'stickers';
  const buildAssetsPath = Paths.getTargetAssetsPath({
    projectRoot: paths.projectRoot,
    targetDirectory: props.directory,
    isStickers,
    buildSubdirectory: props.buildSubdirectory,
  });

  return {
    isStickers,
    buildAssetsPath,
    referencePath: path.relative(paths.platformProjectRoot, buildAssetsPath),
    userAssetsPath: workspace.userAssetsPath,
    copyUserAssets: workspace.hasUserAssets,
    colorsets: planColorsets({ props, projectRoot: paths.projectRoot }),
    stickers: isStickers
      ? planStickers({ props, identity, paths, buildAssetsPath })
      : undefined,
  };
}
