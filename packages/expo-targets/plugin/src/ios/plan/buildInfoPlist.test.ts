import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import plist from '@expo/plist';
import { normalizePlist } from '../../../test-utils/normalizePlist';
import {
  getFrameworksForType,
  productTypeForType,
} from '../../domain/characteristics';
import {
  buildShareExtensionActivationRules,
  getTargetInfoPlistForType,
} from './buildInfoPlist';

const goldenDir = path.join(__dirname, '../../../__fixtures__/golden');

function readGolden(name: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(goldenDir, name), 'utf-8'));
}

describe('productTypeForType', () => {
  test('share extensions use the app-extension product type', () => {
    expect(productTypeForType('share')).toBe(
      'com.apple.product-type.app-extension'
    );
  });

  test('clip uses the on-demand install capable application product type', () => {
    expect(productTypeForType('clip')).toBe(
      'com.apple.product-type.application.on-demand-install-capable'
    );
  });

  test('stickers use the messages-sticker-pack product type', () => {
    expect(productTypeForType('stickers')).toBe(
      'com.apple.product-type.app-extension.messages-sticker-pack'
    );
  });
});

describe('getFrameworksForType', () => {
  test('share extensions require Social and MobileCoreServices', () => {
    expect(getFrameworksForType('share')).toEqual([
      'Social',
      'MobileCoreServices',
    ]);
  });

  test('clip requires no explicit frameworks (SwiftUI auto-linked)', () => {
    expect(getFrameworksForType('clip')).toEqual([]);
  });

  test('stickers require no frameworks (asset-only)', () => {
    expect(getFrameworksForType('stickers')).toEqual([]);
  });
});

describe('getTargetInfoPlistForType (characterization)', () => {
  test('share extension Info.plist matches golden output', () => {
    const parsed = plist.parse(getTargetInfoPlistForType('share'));
    expect(normalizePlist(parsed)).toBe(
      normalizePlist(readGolden('share-info-plist.json'))
    );
  });

  test('clip Info.plist matches golden output', () => {
    const parsed = plist.parse(getTargetInfoPlistForType('clip'));
    expect(normalizePlist(parsed)).toBe(
      normalizePlist(readGolden('clip-info-plist.json'))
    );
  });

  test('stickers Info.plist matches golden output', () => {
    const parsed = plist.parse(getTargetInfoPlistForType('stickers'));
    expect(normalizePlist(parsed)).toBe(
      normalizePlist(readGolden('stickers-info-plist.json'))
    );
  });

  test('displayName becomes CFBundleDisplayName (not PRODUCT_NAME)', () => {
    const parsed = plist.parse(
      getTargetInfoPlistForType('stickers', { displayName: 'Fun Stickers' })
    ) as { CFBundleDisplayName?: string };
    expect(parsed.CFBundleDisplayName).toBe('Fun Stickers');
  });

  test('watch companion sets WKCompanionAppBundleIdentifier', () => {
    const parsed = plist.parse(
      getTargetInfoPlistForType('watch', {
        displayName: 'ET Watch Target',
        companionAppBundleIdentifier: 'com.expotargets.example.watch',
      })
    ) as {
      WKCompanionAppBundleIdentifier?: string;
      CFBundleDisplayName?: string;
    };
    expect(parsed.WKCompanionAppBundleIdentifier).toBe(
      'com.expotargets.example.watch'
    );
    expect(parsed.CFBundleDisplayName).toBe('ET Watch Target');
  });

  test('share extension with React Native entry uses ReactNativeViewController', () => {
    const parsed = plist.parse(
      getTargetInfoPlistForType('share', { entry: './index.tsx' })
    ) as any;

    expect(parsed.NSExtension.NSExtensionPrincipalClass).toBe(
      '$(PRODUCT_MODULE_NAME).ReactNativeViewController'
    );
  });

  test('clip with React Native entry stays an application (no NSExtension)', () => {
    const parsed = plist.parse(
      getTargetInfoPlistForType('clip', { entry: './index.tsx' })
    ) as any;

    expect(parsed.NSExtension).toBeUndefined();
    expect(parsed.NSAppClip).toBeDefined();
  });

  test('app-intent uses ExtensionKit EXAppExtensionAttributes (not NSExtension)', () => {
    const parsed = plist.parse(getTargetInfoPlistForType('app-intent')) as {
      NSExtension?: unknown;
      EXAppExtensionAttributes?: { EXExtensionPointIdentifier?: string };
    };
    expect(parsed.NSExtension).toBeUndefined();
    expect(parsed.EXAppExtensionAttributes?.EXExtensionPointIdentifier).toBe(
      'com.apple.appintents-extension'
    );
  });
});

describe('buildShareExtensionActivationRules', () => {
  test('defaults to text and single web URL support', () => {
    expect(buildShareExtensionActivationRules()).toEqual({
      NSExtensionActivationSupportsText: true,
      NSExtensionActivationSupportsWebURLWithMaxCount: 1,
    });
  });

  test('builds rules for image and video with custom max counts', () => {
    expect(
      buildShareExtensionActivationRules([
        { type: 'image', maxCount: 3 },
        { type: 'video', maxCount: 2 },
      ])
    ).toEqual({
      NSExtensionActivationSupportsImageWithMaxCount: 3,
      NSExtensionActivationSupportsMovieWithMaxCount: 2,
    });
  });

  test('enables webpage support for url type when preprocessing file provided', () => {
    expect(
      buildShareExtensionActivationRules(
        [{ type: 'url', maxCount: 1 }],
        'Preprocess.js'
      )
    ).toEqual({
      NSExtensionActivationSupportsWebPageWithMaxCount: 1,
      NSExtensionActivationSupportsWebURLWithMaxCount: 1,
    });
  });
});
