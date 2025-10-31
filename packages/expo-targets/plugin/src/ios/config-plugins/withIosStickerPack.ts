import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';

import { Asset, Paths } from '../utils';

export const withIosStickerPack: ConfigPlugin<{
  name: string;
  assets: string[];
  targetName: string;
  targetDirectory: string;
}> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const stickerPackPath = Paths.getStickerPackPath({
        platformProjectRoot: config.modRequest.platformProjectRoot,
        targetName: props.targetName,
        stickerPackName: props.name,
      });

      Asset.createStickerPack({
        stickerPackPath,
        name: props.name,
        assets: props.assets,
      });

      // Copy sticker assets to the pack
      props.assets.forEach((assetPath) => {
        const absoluteAssetPath = path.isAbsolute(assetPath)
          ? assetPath
          : path.join(
              config.modRequest.projectRoot,
              props.targetDirectory,
              assetPath
            );

        if (fs.existsSync(absoluteAssetPath)) {
          const filename = path.basename(assetPath);
          const baseName = path.basename(assetPath, path.extname(assetPath));
          const stickerDirPath = path.join(
            stickerPackPath,
            `${baseName}.sticker`
          );

          // Create .sticker directory with Contents.json
          Asset.createSticker({
            stickerPath: stickerDirPath,
            filename,
          });

          // Copy image into .sticker directory
          const destPath = path.join(stickerDirPath, filename);
          fs.copyFileSync(absoluteAssetPath, destPath);
        } else {
          console.warn(
            `[expo-targets] Sticker asset not found: ${absoluteAssetPath}`
          );
        }
      });

      return config;
    },
  ]);
};
