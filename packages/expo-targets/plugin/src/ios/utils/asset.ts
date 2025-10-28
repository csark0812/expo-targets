import normalizeColor from '@react-native/normalize-colors';
import path from 'path';

import * as FileUtils from './file';

/**
 * iOS asset utilities for creating colorsets, imagesets, etc.
 */

/**
 * Color components for iOS colorset.
 */
interface ColorComponents {
  red: string;
  green: string;
  blue: string;
  alpha: string;
}

/**
 * Normalize a color string to RGBA components for iOS.
 */
export function normalizeColorToComponents(color: string): ColorComponents {
  const normalized = normalizeColor(color);
  if (normalized === null || normalized === undefined) {
    throw new Error(`Invalid color: ${color}`);
  }
  const r = ((normalized >> 16) & 0xff) / 255;
  const g = ((normalized >> 8) & 0xff) / 255;
  const b = (normalized & 0xff) / 255;
  const a = ((normalized >> 24) & 0xff) / 255;
  return {
    red: r.toFixed(3),
    green: g.toFixed(3),
    blue: b.toFixed(3),
    alpha: a.toFixed(3),
  };
}

/**
 * Create a colorset in Assets.xcassets.
 */
export function createColorset({
  colorsetPath,
  color,
  darkColor,
}: {
  colorsetPath: string;
  color: string;
  darkColor?: string;
}): void {
  FileUtils.ensureDirectoryExists(colorsetPath);

  const colors: any[] = [
    {
      color: {
        'color-space': 'srgb',
        components: normalizeColorToComponents(color),
      },
      idiom: 'universal',
    },
  ];

  if (darkColor) {
    colors.push({
      appearances: [{ appearance: 'luminosity', value: 'dark' }],
      color: {
        'color-space': 'srgb',
        components: normalizeColorToComponents(darkColor),
      },
      idiom: 'universal',
    });
  }

  const contentsJson = {
    colors,
    info: { author: 'xcode', version: 1 },
  };

  FileUtils.writeFileSafe(
    path.join(colorsetPath, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
}

/**
 * Create an empty imageset in Assets.xcassets.
 */
export function createImageset({
  imagesetPath,
  imageFilename,
}: {
  imagesetPath: string;
  imageFilename?: string;
}): void {
  FileUtils.ensureDirectoryExists(imagesetPath);

  const contentsJson: any = {
    images: [
      {
        idiom: 'universal',
        scale: '1x',
      },
      {
        idiom: 'universal',
        scale: '2x',
      },
      {
        idiom: 'universal',
        scale: '3x',
      },
    ],
    info: { author: 'xcode', version: 1 },
  };

  if (imageFilename) {
    contentsJson.images[0].filename = imageFilename;
  }

  FileUtils.writeFileSafe(
    path.join(imagesetPath, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
}

/**
 * Create the root Contents.json for Assets.xcassets.
 */
export function createAssetsXcassetsRoot(assetsPath: string): void {
  FileUtils.ensureDirectoryExists(assetsPath);

  const contentsJson = {
    info: { author: 'xcode', version: 1 },
  };

  FileUtils.writeFileSafe(
    path.join(assetsPath, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
}

/**
 * Create a sticker pack in Assets.xcassets.
 */
export function createStickerPack({
  stickerPackPath,
  name,
  assets,
}: {
  stickerPackPath: string;
  name: string;
  assets: string[];
}): void {
  FileUtils.ensureDirectoryExists(stickerPackPath);

  const stickers = assets.map((asset) => ({
    filename: path.basename(asset),
  }));

  const contentsJson = {
    properties: {
      'grid-size': 'regular',
    },
    stickers,
    info: { author: 'xcode', version: 1 },
  };

  FileUtils.writeFileSafe(
    path.join(stickerPackPath, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
}

/**
 * Create iMessage App Icon set in Assets.xcassets.
 * Required for iMessage extensions to appear in Messages app drawer.
 */
export function createIMessageAppIcon({
  iconsetPath,
  sourceIconPath,
}: {
  iconsetPath: string;
  sourceIconPath?: string;
}): void {
  FileUtils.ensureDirectoryExists(iconsetPath);

  const iconFiles = [
    'iMessage-App-Icon-29x29@2x.png',
    'iMessage-App-Icon-29x29@3x.png',
    'iMessage-App-Icon-60x45@2x.png',
    'iMessage-App-Icon-60x45@3x.png',
    'iMessage-App-Store-Icon-1024x768.png',
  ];

  const images = [
    {
      size: '29x29',
      idiom: 'iphone',
      filename: sourceIconPath ? iconFiles[0] : undefined,
      scale: '2x',
    },
    {
      size: '29x29',
      idiom: 'iphone',
      filename: sourceIconPath ? iconFiles[1] : undefined,
      scale: '3x',
    },
    {
      size: '60x45',
      idiom: 'iphone',
      filename: sourceIconPath ? iconFiles[2] : undefined,
      scale: '2x',
    },
    {
      size: '60x45',
      idiom: 'iphone',
      filename: sourceIconPath ? iconFiles[3] : undefined,
      scale: '3x',
    },
    {
      size: '1024x768',
      idiom: 'ios-marketing',
      filename: sourceIconPath ? iconFiles[4] : undefined,
      scale: '1x',
    },
  ];

  const contentsJson = {
    images,
    info: { author: 'xcode', version: 1 },
  };

  FileUtils.writeFileSafe(
    path.join(iconsetPath, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );

  // Copy source icon to all required sizes
  // Note: This copies the same image - ideally should resize, but requires image processing libs
  // iOS will scale the images at runtime if they're the wrong size
  if (sourceIconPath && FileUtils.isFile(sourceIconPath)) {
    const fs = require('fs');
    iconFiles.forEach((filename) => {
      const destPath = path.join(iconsetPath, filename);
      fs.copyFileSync(sourceIconPath, destPath);
    });
    console.log(
      `[expo-targets] Copied iMessage App Icon from ${path.basename(sourceIconPath)}`
    );
  } else if (sourceIconPath) {
    console.warn(
      `[expo-targets] iMessage App Icon source not found: ${sourceIconPath}`
    );
  }
}
