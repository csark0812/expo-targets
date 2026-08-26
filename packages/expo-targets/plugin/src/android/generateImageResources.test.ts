import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { generateImageResources } from './generateImageResources';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

let tempRoot: string;

function makeRoot(): string {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'et-android-images-'));
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

describe('generateImageResources png', () => {
  test('copies a png into drawable with a prefixed resource name', () => {
    const root = makeRoot();
    const sourcePath = path.join(root, 'targets/hello-widget/assets/logo.png');
    writeFile(sourcePath, PNG_1X1);

    generateImageResources({
      projectRoot: root,
      targetDirectory: 'targets/hello-widget',
      targetName: 'HelloWidget',
      images: { Logo: './assets/logo.png' },
    });

    const dest = path.join(
      root,
      'targets/hello-widget/android/res/drawable/hellowidget_logo.png'
    );
    expect(fs.existsSync(dest)).toBe(true);
  });
});

describe('generateImageResources density', () => {
  test('maps @2x to xhdpi and @3x to xxhdpi', () => {
    const root = makeRoot();
    const assets = path.join(root, 'targets/hello-widget/assets');
    writeFile(path.join(assets, 'logo.png'), PNG_1X1);
    writeFile(path.join(assets, 'logo@2x.png'), PNG_1X1);
    writeFile(path.join(assets, 'logo@3x.png'), PNG_1X1);

    generateImageResources({
      projectRoot: root,
      targetDirectory: 'targets/hello-widget',
      targetName: 'HelloWidget',
      images: { Logo: './assets/logo.png' },
    });

    const res = path.join(root, 'targets/hello-widget/android/res');
    expect(
      fs.existsSync(path.join(res, 'drawable-mdpi/hellowidget_logo.png'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(res, 'drawable-xhdpi/hellowidget_logo.png'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(res, 'drawable-xxhdpi/hellowidget_logo.png'))
    ).toBe(true);
    expect(fs.existsSync(path.join(res, 'drawable/hellowidget_logo.png'))).toBe(
      false
    );
  });
});

describe('generateImageResources svg', () => {
  test('does not copy svg into drawable', () => {
    const root = makeRoot();
    const sourcePath = path.join(root, 'targets/w/assets/scan-card.svg');
    writeFile(sourcePath, '<svg xmlns="http://www.w3.org/2000/svg"/>');

    generateImageResources({
      projectRoot: root,
      targetDirectory: 'targets/w',
      targetName: 'W',
      images: { 'scan-card': './assets/scan-card.svg' },
    });

    const res = path.join(root, 'targets/w/android/res');
    expect(fs.existsSync(path.join(res, 'drawable/w_scan_card.svg'))).toBe(
      false
    );
    expect(fs.existsSync(path.join(res, 'drawable/w_scan_card.xml'))).toBe(
      false
    );
  });
});
