import path from 'node:path';

import type { Color } from '../../config';
import type { TargetWorkspace } from '../observe/workspace';
import * as Paths from '../utils/paths';
import type {
  AssetPlan,
  ColorsetPlan,
  ImagesetPlan,
  IOSTargetProps,
  ProjectPaths,
  StickerPackPlan,
  StickersPlan,
  TargetIdentity,
} from './types';

const IMESSAGE_APP_ICON = 'iMessage App Icon.stickersiconset';

function planColorsets({
  props,
  paths,
}: {
  props: IOSTargetProps;
  paths: ProjectPaths;
}): ColorsetPlan[] {
  return Object.entries(props.colors || {}).map(([name, value]) => {
    const colorsetPath = Paths.getTargetColorsetPath({
      platformProjectRoot: paths.platformProjectRoot,
      projectName: paths.projectName,
      productName: Paths.sanitizeTargetName(props.name),
      colorName: name,
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

function resolveTargetRelativePath({
  assetPath,
  props,
  paths,
}: {
  assetPath: string;
  props: IOSTargetProps;
  paths: ProjectPaths;
}): string {
  return path.isAbsolute(assetPath)
    ? assetPath
    : path.join(paths.projectRoot, props.directory, assetPath);
}

function planImagesets({
  props,
  paths,
}: {
  props: IOSTargetProps;
  paths: ProjectPaths;
}): ImagesetPlan[] {
  return Object.entries(props.images || {}).map(([name, assetPath]) => ({
    name,
    imagesetPath: Paths.getTargetImagesetPath({
      platformProjectRoot: paths.platformProjectRoot,
      projectName: paths.projectName,
      productName: Paths.sanitizeTargetName(props.name),
      imageName: name,
    }),
    sourcePath: resolveTargetRelativePath({ assetPath, props, paths }),
  }));
}

function planStickerPacks({
  props,
  paths,
  buildAssetsPath,
}: {
  props: IOSTargetProps;
  paths: ProjectPaths;
  buildAssetsPath: string;
}): StickerPackPlan[] {
  return (props.stickerPacks || []).map((pack) => {
    // Packs must live in the same Stickers.xcassets Xcode references
    // (ExpoTargetsGenerated/<Product>/), not a co-located user catalog.
    const stickerPackPath = path.join(
      buildAssetsPath,
      `${pack.name}.stickerpack`
    );
    const assets = pack.assets.map((assetPath) => {
      const sourcePath = resolveTargetRelativePath({
        assetPath,
        props,
        paths,
      });
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
  paths,
  buildAssetsPath,
}: {
  props: IOSTargetProps;
  paths: ProjectPaths;
  buildAssetsPath: string;
}): StickersPlan {
  return {
    assetsPath: buildAssetsPath,
    iconsetPath: path.join(buildAssetsPath, IMESSAGE_APP_ICON),
    // Match stickerPacks: paths in expo-target.config.json are relative to the
    // target directory (e.g. targets/stickers/assets/...), not the app root.
    sourceIconPath: props.targetIcon
      ? resolveTargetRelativePath({
          assetPath: props.targetIcon,
          props,
          paths,
        })
      : undefined,
    packs: planStickerPacks({ props, paths, buildAssetsPath }),
  };
}

function wantsIMessageAppIcon(props: IOSTargetProps): boolean {
  return (
    props.type === 'stickers' ||
    (props.type === 'messages' && Boolean(props.targetIcon))
  );
}

/**
 * Plan the target's asset catalog: which user assets to copy into the build
 * directory, which color and image sets to generate, and (for stickers /
 * messages with `targetIcon`) the iMessage app icon set.
 */
export function planAssets({
  workspace,
  props,
  identity: _identity,
  paths,
}: {
  workspace: TargetWorkspace;
  props: IOSTargetProps;
  identity: TargetIdentity;
  paths: ProjectPaths;
}): AssetPlan {
  const isStickers = props.type === 'stickers';
  const buildAssetsPath = Paths.getTargetAssetsPath({
    platformProjectRoot: paths.platformProjectRoot,
    projectName: paths.projectName,
    productName: Paths.sanitizeTargetName(props.name),
    isStickers,
  });

  return {
    isStickers,
    buildAssetsPath,
    referencePath: path.relative(paths.platformProjectRoot, buildAssetsPath),
    userAssetsPath: workspace.userAssetsPath,
    copyUserAssets: workspace.hasUserAssets,
    colorsets: planColorsets({ props, paths }),
    imagesets: planImagesets({ props, paths }),
    stickers: wantsIMessageAppIcon(props)
      ? planStickers({ props, paths, buildAssetsPath })
      : undefined,
  };
}
