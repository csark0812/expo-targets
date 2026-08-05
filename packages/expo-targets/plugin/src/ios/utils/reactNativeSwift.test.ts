import { describe, expect, test } from 'bun:test';

import { generateReactNativeViewController } from './reactNativeSwift';

const baseOptions = {
  type: 'share' as const,
  moduleName: 'ShareExt',
  targetName: 'ShareExt',
};

describe('generateReactNativeViewController', () => {
  test('substitutes BUNDLE_ROOT from entry path', () => {
    const result = generateReactNativeViewController({
      ...baseOptions,
      entry: './targets/share-ext/index.tsx',
    });

    expect(result).not.toContain('{{BUNDLE_ROOT}}');
    expect(result).toContain('bundleRoot: "targets/share-ext/index"');
  });

  test('uses default virtual metro entry when entry omitted', () => {
    const result = generateReactNativeViewController({
      ...baseOptions,
    });

    expect(result).toContain('bundleRoot: ".expo/.virtual-metro-entry"');
  });

  test('substitutes MODULE_NAME and TARGET_NAME placeholders', () => {
    const result = generateReactNativeViewController({
      ...baseOptions,
      entry: './index.tsx',
    });

    expect(result).not.toContain('{{MODULE_NAME}}');
    expect(result).not.toContain('{{TARGET_NAME}}');
    expect(result).toContain('withModuleName: "ShareExt"');
    expect(result).toContain('URLQueryItem(name: "target", value: "ShareExt")');
  });

  test('includes Metro fallback and error handling in template output', () => {
    const result = generateReactNativeViewController({
      ...baseOptions,
      entry: './index.tsx',
    });

    expect(result).toContain('embeddedBundleURL()');
    expect(result).toContain('debugBundleURL()');
    expect(result).toContain('Could not load the JavaScript bundle');
  });
});
