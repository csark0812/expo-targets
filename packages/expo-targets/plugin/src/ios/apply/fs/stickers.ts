import fs from 'node:fs';
import path from 'node:path';

import type { Logger } from '../../../logger';
import type { StickerPackPlan, StickersPlan } from '../../plan/types';
import * as Asset from '../../utils/asset';

function applyStickerPack(pack: StickerPackPlan, logger: Logger): void {
  // Replace the pack directory so renamed/removed stickers (e.g. brutus → bip)
  // do not linger in Stickers.xcassets / the installed appex.
  if (fs.existsSync(pack.stickerPackPath)) {
    fs.rmSync(pack.stickerPackPath, { recursive: true, force: true });
  }

  Asset.createStickerPack({
    stickerPackPath: pack.stickerPackPath,
    name: pack.name,
    assets: pack.assets.map((asset) => asset.filename),
  });

  for (const asset of pack.assets) {
    if (!fs.existsSync(asset.sourcePath)) {
      logger.warn(`Sticker asset not found: ${asset.sourcePath}`);
      continue;
    }

    Asset.createSticker({
      stickerPath: asset.stickerPath,
      filename: asset.filename,
    });
    fs.copyFileSync(
      asset.sourcePath,
      path.join(asset.stickerPath, asset.filename)
    );
  }
}

/**
 * Create the sticker catalog: the required iMessage app icon set plus one
 * `.stickerpack` per configured pack.
 */
export function applyStickersPlan(plan: StickersPlan, logger: Logger): void {
  Asset.createAssetsXcassetsRoot(plan.assetsPath);
  Asset.createIMessageAppIcon({
    iconsetPath: plan.iconsetPath,
    sourceIconPath: plan.sourceIconPath,
  });

  for (const pack of plan.packs) {
    applyStickerPack(pack, logger);
    logger.log(
      `Created sticker pack "${pack.name}" with ${pack.assets.length} sticker(s)`
    );
  }
}
