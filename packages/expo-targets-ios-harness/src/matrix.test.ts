import { afterEach, describe, expect, test } from 'bun:test';
import process from 'node:process';
import {
  isExampleRel,
  resolveMatrixEntries,
  resolveMatrixEntry,
  shareSheetMatrix,
} from './matrix';

const OVERRIDE_KEYS = [
  'UITEST_HOST_BUNDLE_ID_OVERRIDE',
  'UITEST_EXTENSION_NAME_OVERRIDE',
] as const;

afterEach(() => {
  for (const key of OVERRIDE_KEYS) {
    delete process.env[key];
  }
});

describe('shareSheetMatrix', () => {
  test('covers all four Share Sheet examples', () => {
    expect(shareSheetMatrix()).toEqual([
      'examples/share',
      'examples/action',
      'examples/native/share',
      'examples/native/action',
    ]);
  });
});

describe('isExampleRel', () => {
  test('accepts matrix paths only', () => {
    expect(isExampleRel('examples/share')).toBe(true);
    expect(isExampleRel('examples/clip')).toBe(false);
  });
});

describe('resolveMatrixEntry', () => {
  test('uses share defaults matching bash attach script', () => {
    const entry = resolveMatrixEntry('examples/share');
    expect(entry.scheme).toBe('ETShare');
    expect(entry.env.UITEST_HOST_BUNDLE_ID).toBe(
      'com.expotargets.example.share'
    );
    expect(entry.env.UITEST_EXTENSION_NAME).toBe('ET Share');
    expect(entry.env.UITEST_COMPLETE_BUTTON).toBe('Save');
  });

  test('uses action defaults without bare Action alias', () => {
    const entry = resolveMatrixEntry('examples/action');
    expect(entry.scheme).toBe('ETAction');
    expect(entry.env.UITEST_EXTENSION_NAME).toBe('Example Action');
    expect(entry.env.UITEST_EXTENSION_ALIASES).not.toContain(',Action');
    expect(
      entry.env.UITEST_EXTENSION_ALIASES.split(',').includes('Action')
    ).toBe(false);
  });

  test('honors UITEST_*_OVERRIDE env vars', () => {
    process.env.UITEST_HOST_BUNDLE_ID_OVERRIDE = 'com.override.host';
    process.env.UITEST_EXTENSION_NAME_OVERRIDE = 'Override Ext';
    const entry = resolveMatrixEntry('examples/share');
    expect(entry.env.UITEST_HOST_BUNDLE_ID).toBe('com.override.host');
    expect(entry.env.UITEST_EXTENSION_NAME).toBe('Override Ext');
    expect(entry.env.UITEST_COMPLETE_BUTTON).toBe('Save');
  });
});

describe('resolveMatrixEntries', () => {
  test('maps every matrix example', () => {
    const entries = resolveMatrixEntries();
    expect(entries.map((e) => e.exampleRel)).toEqual(shareSheetMatrix());
  });
});
