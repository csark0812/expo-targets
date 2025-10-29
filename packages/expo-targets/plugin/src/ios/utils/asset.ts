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
 * Create an individual sticker in a sticker pack.
 */
export function createSticker({
  stickerPath,
  filename,
}: {
  stickerPath: string;
  filename: string;
}): void {
  FileUtils.ensureDirectoryExists(stickerPath);

  const contentsJson = {
    info: { author: 'xcode', version: 1 },
    properties: {
      filename,
    },
  };

  FileUtils.writeFileSafe(
    path.join(stickerPath, 'Contents.json'),
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

  const stickers = assets.map((asset) => {
    const baseName = path.basename(asset, path.extname(asset));
    return {
      filename: `${baseName}.sticker`,
    };
  });

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
 * Icon size configuration for iMessage App Icons.
 */
interface IconSize {
  filename: string;
  width: number;
  height: number;
  size: string;
  idiom: string;
  scale: string;
  platform?: string;
}

/**
 * Generate a single icon size using sips with proper cropping.
 */
function generateIcon({
  sourceIconPath,
  outputPath,
  width,
  height,
}: {
  sourceIconPath: string;
  outputPath: string;
  width: number;
  height: number;
}): boolean {
  try {
    const { execSync } = require('child_process');

    // Use sips -Z to crop to aspect ratio, then resize
    // First crop to match aspect ratio, then resize to exact dimensions
    const targetRatio = width / height;

    // Create a temporary intermediate file for the cropped version
    const tempPath = outputPath + '.temp.png';

    // Get source dimensions
    const sizeOutput = execSync(
      `sips -g pixelWidth -g pixelHeight "${sourceIconPath}"`,
      { encoding: 'utf-8' }
    );
    const widthMatch = sizeOutput.match(/pixelWidth: (\d+)/);
    const heightMatch = sizeOutput.match(/pixelHeight: (\d+)/);

    if (!widthMatch || !heightMatch) {
      throw new Error('Could not determine source image dimensions');
    }

    const sourceWidth = parseInt(widthMatch[1], 10);
    const sourceHeight = parseInt(heightMatch[1], 10);
    const sourceRatio = sourceWidth / sourceHeight;

    let cropWidth: number;
    let cropHeight: number;

    if (sourceRatio > targetRatio) {
      // Source is wider, crop width
      cropHeight = sourceHeight;
      cropWidth = Math.round(sourceHeight * targetRatio);
    } else {
      // Source is taller, crop height
      cropWidth = sourceWidth;
      cropHeight = Math.round(sourceWidth / targetRatio);
    }

    // Calculate crop position (center crop)
    const cropX = Math.round((sourceWidth - cropWidth) / 2);
    const cropY = Math.round((sourceHeight - cropHeight) / 2);

    // Crop the image to the correct aspect ratio
    execSync(
      `sips -c ${cropHeight} ${cropWidth} --cropOffset ${cropY} ${cropX} "${sourceIconPath}" --out "${tempPath}"`,
      { stdio: 'ignore' }
    );

    // Now resize to exact dimensions
    execSync(`sips -z ${height} ${width} "${tempPath}" --out "${outputPath}"`, {
      stdio: 'ignore',
    });

    // Clean up temp file
    const fs = require('fs');
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    return true;
  } catch (error) {
    console.error(
      `[expo-targets] Failed to generate icon ${outputPath}:`,
      error
    );
    return false;
  }
}

/**
 * Create iMessage App Icon set in Assets.xcassets.
 * Generates all 13 required icon sizes with proper cropping to maintain aspect ratio.
 */
export function createIMessageAppIcon({
  iconsetPath,
  sourceIconPath,
}: {
  iconsetPath: string;
  sourceIconPath?: string;
}): void {
  FileUtils.ensureDirectoryExists(iconsetPath);

  // All required icon sizes for iMessage sticker packs
  const iconSizes: IconSize[] = [
    {
      filename: 'icon-iphone-29x29@2x.png',
      width: 58,
      height: 58,
      size: '29x29',
      idiom: 'iphone',
      scale: '2x',
    },
    {
      filename: 'icon-iphone-29x29@3x.png',
      width: 87,
      height: 87,
      size: '29x29',
      idiom: 'iphone',
      scale: '3x',
    },
    {
      filename: 'icon-iphone-60x45@2x.png',
      width: 120,
      height: 90,
      size: '60x45',
      idiom: 'iphone',
      scale: '2x',
    },
    {
      filename: 'icon-iphone-60x45@3x.png',
      width: 180,
      height: 135,
      size: '60x45',
      idiom: 'iphone',
      scale: '3x',
    },
    {
      filename: 'icon-ipad-29x29@2x.png',
      width: 58,
      height: 58,
      size: '29x29',
      idiom: 'ipad',
      scale: '2x',
    },
    {
      filename: 'icon-ipad-67x50@2x.png',
      width: 134,
      height: 100,
      size: '67x50',
      idiom: 'ipad',
      scale: '2x',
    },
    {
      filename: 'icon-ipad-74x55@2x.png',
      width: 148,
      height: 110,
      size: '74x55',
      idiom: 'ipad',
      scale: '2x',
    },
    {
      filename: 'icon-ios-marketing-1024x1024.png',
      width: 1024,
      height: 1024,
      size: '1024x1024',
      idiom: 'ios-marketing',
      scale: '1x',
    },
    {
      filename: 'icon-ios-27x20@2x.png',
      width: 54,
      height: 40,
      size: '27x20',
      idiom: 'universal',
      scale: '2x',
      platform: 'ios',
    },
    {
      filename: 'icon-ios-27x20@3x.png',
      width: 81,
      height: 60,
      size: '27x20',
      idiom: 'universal',
      scale: '3x',
      platform: 'ios',
    },
    {
      filename: 'icon-ios-32x24@2x.png',
      width: 64,
      height: 48,
      size: '32x24',
      idiom: 'universal',
      scale: '2x',
      platform: 'ios',
    },
    {
      filename: 'icon-ios-32x24@3x.png',
      width: 96,
      height: 72,
      size: '32x24',
      idiom: 'universal',
      scale: '3x',
      platform: 'ios',
    },
    {
      filename: 'icon-ios-1024x768.png',
      width: 1024,
      height: 768,
      size: '1024x768',
      idiom: 'ios-marketing',
      scale: '1x',
      platform: 'ios',
    },
  ];

  // Create Contents.json with all icon references
  const images = iconSizes.map((iconSize) => {
    const entry: any = {
      size: iconSize.size,
      idiom: iconSize.idiom,
      filename: iconSize.filename,
      scale: iconSize.scale,
    };

    if (iconSize.platform) {
      entry.platform = iconSize.platform;
    }

    return entry;
  });

  const contentsJson = {
    images,
    info: { author: 'xcode', version: 1 },
  };

  FileUtils.writeFileSafe(
    path.join(iconsetPath, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );

  // Generate all icon sizes from source
  if (sourceIconPath && FileUtils.isFile(sourceIconPath)) {
    console.log(
      `[expo-targets] Generating iMessage App Icons from ${path.basename(sourceIconPath)}...`
    );

    let successCount = 0;

    for (const iconSize of iconSizes) {
      const outputPath = path.join(iconsetPath, iconSize.filename);
      const success = generateIcon({
        sourceIconPath,
        outputPath,
        width: iconSize.width,
        height: iconSize.height,
      });

      if (success) {
        successCount++;
      }
    }

    console.log(
      `[expo-targets] Generated ${successCount}/${iconSizes.length} iMessage App Icons`
    );

    if (successCount < iconSizes.length) {
      console.warn(
        `[expo-targets] Warning: Failed to generate ${iconSizes.length - successCount} icons. Build may fail.`
      );
    }
  } else if (sourceIconPath) {
    console.warn(
      `[expo-targets] iMessage App Icon source not found: ${sourceIconPath}`
    );
    console.warn(
      `[expo-targets] Build will fail without proper icons. Please provide a valid icon source.`
    );
  }
}
