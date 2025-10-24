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
