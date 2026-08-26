import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { AssetPlan, ImagesetPlan } from '../../plan/types';
import { applyAssetPlan } from './assets';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>`;

let tempRoot: string;

function makeRoot(): string {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'et-imageset-'));
  return tempRoot;
}

afterEach(() => {
  if (tempRoot) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

function writeFile(filePath: string, contents: string | Buffer): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function planFor({
  buildAssetsPath,
  imagesets,
  copyUserAssets = false,
  userAssetsPath,
}: {
  buildAssetsPath: string;
  imagesets: ImagesetPlan[];
  copyUserAssets?: boolean;
  userAssetsPath?: string;
}): AssetPlan {
  return {
    isStickers: false,
    buildAssetsPath,
    referencePath: 'App/ExpoTargetsGenerated/Widget/Assets.xcassets',
    userAssetsPath: userAssetsPath ?? path.join(buildAssetsPath, 'unused-user'),
    copyUserAssets,
    colorsets: [],
    imagesets,
  };
}

function logoPlan(buildAssetsPath: string, sourcePath: string): ImagesetPlan {
  return {
    name: 'Logo',
    sourcePath,
    imagesetPath: path.join(buildAssetsPath, 'Logo.imageset'),
  };
}

function readContents(imagesetPath: string) {
  return JSON.parse(
    fs.readFileSync(path.join(imagesetPath, 'Contents.json'), 'utf-8')
  );
}

function scaleEntry(contents: { images: { scale: string }[] }, scale: string) {
  return contents.images.find((entry) => entry.scale === scale);
}

describe('applyAssetPlan png imageset', () => {
  test('copies a png and names the 1x slot', () => {
    const root = makeRoot();
    const sourcePath = path.join(root, 'targets/widget/assets/logo.png');
    const buildAssetsPath = path.join(root, 'catalog');
    writeFile(sourcePath, PNG_1X1);

    applyAssetPlan(
      planFor({
        buildAssetsPath,
        imagesets: [logoPlan(buildAssetsPath, sourcePath)],
      })
    );

    const imageset = path.join(buildAssetsPath, 'Logo.imageset');
    expect(fs.existsSync(path.join(imageset, 'logo.png'))).toBe(true);
    expect(readContents(imageset).images).toEqual([
      { idiom: 'universal', scale: '1x', filename: 'logo.png' },
      { idiom: 'universal', scale: '2x' },
      { idiom: 'universal', scale: '3x' },
    ]);
  });
});

describe('applyAssetPlan scale siblings', () => {
  test('attaches @2x and @3x files next to the 1x source', () => {
    const root = makeRoot();
    const assetsDir = path.join(root, 'targets/widget/assets');
    const sourcePath = path.join(assetsDir, 'logo.png');
    const buildAssetsPath = path.join(root, 'catalog');
    writeFile(sourcePath, PNG_1X1);
    writeFile(path.join(assetsDir, 'logo@2x.png'), PNG_1X1);
    writeFile(path.join(assetsDir, 'logo@3x.png'), PNG_1X1);

    applyAssetPlan(
      planFor({
        buildAssetsPath,
        imagesets: [logoPlan(buildAssetsPath, sourcePath)],
      })
    );

    const imageset = path.join(buildAssetsPath, 'Logo.imageset');
    const contents = readContents(imageset);
    expect(fs.existsSync(path.join(imageset, 'logo@2x.png'))).toBe(true);
    expect(scaleEntry(contents, '2x')).toEqual({
      idiom: 'universal',
      scale: '2x',
      filename: 'logo@2x.png',
    });
    expect(scaleEntry(contents, '3x')).toEqual({
      idiom: 'universal',
      scale: '3x',
      filename: 'logo@3x.png',
    });
  });
});

describe('applyAssetPlan svg imageset', () => {
  test('marks svg imagesets as template vectors', () => {
    const root = makeRoot();
    const sourcePath = path.join(root, 'scan-card.svg');
    const buildAssetsPath = path.join(root, 'catalog');
    writeFile(sourcePath, SVG);

    applyAssetPlan(
      planFor({
        buildAssetsPath,
        imagesets: [
          {
            name: 'scan-card',
            sourcePath,
            imagesetPath: path.join(buildAssetsPath, 'scan-card.imageset'),
          },
        ],
      })
    );

    const contents = readContents(
      path.join(buildAssetsPath, 'scan-card.imageset')
    );
    expect(contents.images[0].filename).toBe('scan-card.svg');
    expect(contents.properties).toEqual({
      'template-rendering-intent': 'template',
      'preserves-vector-representation': true,
    });
  });
});

describe('applyAssetPlan user catalog', () => {
  test('does not clobber a user imageset of the same name', () => {
    const root = makeRoot();
    const sourcePath = path.join(root, 'generated.png');
    const userAssetsPath = path.join(root, 'user', 'Assets.xcassets');
    const buildAssetsPath = path.join(root, 'build', 'Assets.xcassets');
    writeFile(sourcePath, PNG_1X1);
    writeFile(
      path.join(userAssetsPath, 'Logo.imageset', 'Contents.json'),
      JSON.stringify({
        images: [{ idiom: 'universal', filename: 'UserLogo.png' }],
      })
    );
    writeFile(
      path.join(userAssetsPath, 'Logo.imageset', 'UserLogo.png'),
      PNG_1X1
    );

    applyAssetPlan(
      planFor({
        buildAssetsPath,
        userAssetsPath,
        copyUserAssets: true,
        imagesets: [logoPlan(buildAssetsPath, sourcePath)],
      })
    );

    const imageset = path.join(buildAssetsPath, 'Logo.imageset');
    expect(fs.existsSync(path.join(imageset, 'UserLogo.png'))).toBe(true);
    expect(fs.existsSync(path.join(imageset, 'generated.png'))).toBe(false);
    expect(readContents(imageset).images[0].filename).toBe('UserLogo.png');
  });
});

describe('applyAssetPlan leftover imageset', () => {
  test('replaces a previously generated imageset when the user has none', () => {
    const root = makeRoot();
    const sourcePath = path.join(root, 'logo.png');
    const buildAssetsPath = path.join(root, 'catalog');
    const imageset = path.join(buildAssetsPath, 'Logo.imageset');
    writeFile(sourcePath, PNG_1X1);
    writeFile(path.join(imageset, 'stale.png'), PNG_1X1);
    writeFile(
      path.join(imageset, 'Contents.json'),
      JSON.stringify({ images: [{ filename: 'stale.png' }] })
    );

    applyAssetPlan(
      planFor({
        buildAssetsPath,
        imagesets: [logoPlan(buildAssetsPath, sourcePath)],
      })
    );

    expect(fs.existsSync(path.join(imageset, 'stale.png'))).toBe(false);
    expect(fs.existsSync(path.join(imageset, 'logo.png'))).toBe(true);
    expect(readContents(imageset).images[0].filename).toBe('logo.png');
  });
});
