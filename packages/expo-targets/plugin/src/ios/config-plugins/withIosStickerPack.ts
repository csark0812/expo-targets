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
          : path.join(props.targetDirectory, assetPath);

        if (fs.existsSync(absoluteAssetPath)) {
          const destPath = path.join(stickerPackPath, path.basename(assetPath));
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
