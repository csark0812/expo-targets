import { describe, expect, test } from 'bun:test';

import { buildClipBuildNumberScript } from './clipBuildNumber';

describe('buildClipBuildNumberScript', () => {
  test('copies host CURRENT_PROJECT_VERSION into Clip Info.plist', () => {
    const script = buildClipBuildNumberScript('Popl');
    expect(script).toContain('-target "Popl"');
    expect(script).toContain('CFBundleVersion');
    expect(script).toContain('PlistBuddy');
    expect(script).toContain('CURRENT_PROJECT_VERSION');
  });

  test('does not fail the native build when host version is missing', () => {
    const script = buildClipBuildNumberScript('App');
    expect(script).toContain('skip Clip CFBundleVersion');
    expect(script).toContain('exit 0');
  });
});
