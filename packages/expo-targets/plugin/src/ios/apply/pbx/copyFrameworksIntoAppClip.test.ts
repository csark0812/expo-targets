import { describe, expect, test } from 'bun:test';
import { buildCopyFrameworksIntoAppClipScript } from './copyFrameworksIntoAppClip';

describe('buildCopyFrameworksIntoAppClipScript', () => {
  test('targets AppClips/<name>.app/Frameworks', () => {
    const script = buildCopyFrameworksIntoAppClipScript('ExampleClipTarget');
    expect(script).toContain('AppClips/ExampleClipTarget.app');
    expect(script).toContain('rsync -a');
    expect(script).toContain('HOST_FW');
  });

  test('also syncs sibling product Frameworks + jsbundle', () => {
    const script = buildCopyFrameworksIntoAppClipScript('ExampleClipTarget');
    expect(script).toContain('SIBLING_APP');
    expect(script).toContain('ExampleClipTarget-main.jsbundle');
    expect(script).toContain('copy_jsbundle');
  });
});
