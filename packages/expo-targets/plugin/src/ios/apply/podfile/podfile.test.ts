import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizePodfile } from '../../../../test-utils/normalizePodfile';
import {
  ensureMainTargetUsesFrameworks,
  generateReactNativeTargetBlock,
  generateStandaloneTargetBlock,
  hasTargetBlock,
  insertTargetBlock,
  removeTargetBlock,
} from './podfile';

const fixturesDir = path.join(__dirname, '../../../../__fixtures__/podfile');
const plainPodfile = fs.readFileSync(
  path.join(fixturesDir, 'plain.Podfile'),
  'utf-8'
);
const withFrameworksPodfile = fs.readFileSync(
  path.join(fixturesDir, 'with-frameworks.Podfile'),
  'utf-8'
);

describe('hasTargetBlock', () => {
  test('detects an existing target block', () => {
    expect(hasTargetBlock(plainPodfile, 'App')).toBe(true);
  });

  test('returns false when target is absent', () => {
    expect(hasTargetBlock(plainPodfile, 'ShareExtensionTarget')).toBe(false);
  });
});

describe('generateStandaloneTargetBlock', () => {
  test('generates a target block without use_frameworks! by default', () => {
    const block = generateStandaloneTargetBlock({
      targetName: 'ShareExtensionTarget',
      deploymentTarget: '15.1',
    });

    expect(block).toContain("target 'ShareExtensionTarget' do");
    expect(block).toContain("platform :ios, '15.1'");
    expect(block).not.toContain('use_frameworks!');
  });

  test('includes use_frameworks! :linkage => :static when requested', () => {
    const block = generateStandaloneTargetBlock({
      targetName: 'ShareExtensionTarget',
      deploymentTarget: '15.1',
      useFrameworks: true,
    });

    expect(block).toContain('use_frameworks! :linkage => :static');
  });
});

describe('generateReactNativeTargetBlock', () => {
  test('share/action inherit search_paths only', () => {
    const block = generateReactNativeTargetBlock({
      targetName: 'ExampleShareTarget',
      deploymentTarget: '15.1',
      extensionType: 'share',
    });
    expect(block).toContain('inherit! :search_paths');
  });

  test('clip also inherits search_paths (host copies frameworks into AppClips)', () => {
    const block = generateReactNativeTargetBlock({
      targetName: 'ExampleClipTarget',
      deploymentTarget: '15.1',
      extensionType: 'clip',
    });
    expect(block).toContain('inherit! :search_paths');
  });
});

describe('insertTargetBlock + removeTargetBlock', () => {
  test('inserts a standalone target as a sibling of the main target', () => {
    const block = generateStandaloneTargetBlock({
      targetName: 'ShareExtensionTarget',
      deploymentTarget: '15.1',
    });

    const result = insertTargetBlock(plainPodfile, block, {
      standalone: true,
    });

    expect(hasTargetBlock(result, 'ShareExtensionTarget')).toBe(true);
    expect(hasTargetBlock(result, 'App')).toBe(true);
  });

  test('round-trips insert then remove back to the original content', () => {
    const block = generateStandaloneTargetBlock({
      targetName: 'ShareExtensionTarget',
      deploymentTarget: '15.1',
    });

    const inserted = insertTargetBlock(plainPodfile, block, {
      standalone: true,
    });
    const removed = removeTargetBlock(inserted, 'ShareExtensionTarget');

    expect(normalizePodfile(removed)).toBe(normalizePodfile(plainPodfile));
  });

  test('removeTargetBlock is a no-op when the target does not exist', () => {
    const result = removeTargetBlock(plainPodfile, 'DoesNotExist');
    expect(result).toBe(plainPodfile);
  });
});

describe('ensureMainTargetUsesFrameworks', () => {
  test('adds use_frameworks! to a plain main target', () => {
    const result = ensureMainTargetUsesFrameworks(plainPodfile, 'App');
    expect(result).toContain('use_frameworks! :linkage => :static');
  });

  test('is idempotent when use_frameworks! already present', () => {
    const result = ensureMainTargetUsesFrameworks(withFrameworksPodfile, 'App');
    expect(normalizePodfile(result)).toBe(
      normalizePodfile(withFrameworksPodfile)
    );
  });
});
