import { describe, expect, test } from 'bun:test';

import {
  appendGradleImplementations,
  resolveAndroidExtraImplementations,
  ZXING_CORE_COORD,
} from './extraImplementations';

describe('resolveAndroidExtraImplementations', () => {
  test('empty when qr is off and implementation omitted', () => {
    expect(resolveAndroidExtraImplementations()).toEqual([]);
    expect(resolveAndroidExtraImplementations({})).toEqual([]);
  });

  test('qr true injects ZXing', () => {
    expect(resolveAndroidExtraImplementations({ qr: true })).toEqual([
      ZXING_CORE_COORD,
    ]);
  });

  test('custom implementation list is preserved; qr does not duplicate ZXing', () => {
    expect(
      resolveAndroidExtraImplementations({
        qr: true,
        implementation: [ZXING_CORE_COORD, 'com.example:lib:1.0'],
      })
    ).toEqual([ZXING_CORE_COORD, 'com.example:lib:1.0']);
  });
});

describe('appendGradleImplementations', () => {
  test('inserts missing coordinates into dependencies', () => {
    const next = appendGradleImplementations('dependencies {\n}', [
      'com.google.zxing:core:3.4.1',
    ]);
    expect(next).toContain('implementation("com.google.zxing:core:3.4.1")');
  });

  test('is idempotent', () => {
    const once = appendGradleImplementations('dependencies {\n}', [
      ZXING_CORE_COORD,
    ]);
    const twice = appendGradleImplementations(once, [ZXING_CORE_COORD]);
    expect(twice).toBe(once);
  });
});
