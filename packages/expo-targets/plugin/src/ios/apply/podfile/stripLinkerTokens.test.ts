import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';

import {
  EXCLUDED_LINKER_STRIP_RUBY,
  ensureExcludedPackagesPostIntegrate,
} from './podfile';

const MESSAGES_LDFLAGS = [
  'OTHER_LDFLAGS = $(inherited) -ObjC',
  '-l"logrocket_react_native" -l"Intercom"',
  '-framework "CoreText" -framework "ExpoImageManipulator"',
  '-framework "ExpoImagePicker" -framework "ExpoModulesCore"',
  '-framework "Intercom" -framework "AppCheckInterop"',
  '-fmodule-map-file="$(PODS_ROOT)/Headers/Public/Intercom/Intercom.modulemap"',
  '-fmodule-map-file="$(PODS_ROOT)/Headers/Public/ExpoModulesCore/ExpoModulesCore.modulemap"',
].join(' ');

function stripLinkerTokens(xc: string, tokens: string[]): string {
  const script = [
    'tokens = ARGV',
    'xc = STDIN.read',
    ...EXCLUDED_LINKER_STRIP_RUBY,
    'print xc',
  ].join('\n');
  const result = spawnSync('ruby', ['-e', script, ...tokens], {
    input: xc,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `ruby exited ${result.status}`);
  }
  return result.stdout;
}

function frameworkArgv(flags: string): string[] {
  const names: string[] = [];
  const quoted = /-framework\s+"([^"]+)"/g;
  const unquoted = /-framework\s+(\S+)/g;
  for (const match of flags.matchAll(quoted)) {
    names.push(match[1] ?? '');
  }
  for (const match of flags.matchAll(unquoted)) {
    const name = match[1] ?? '';
    if (!name.startsWith('"')) {
      names.push(name);
    }
  }
  return names;
}

describe('invert linker strip argv', () => {
  test('ExpoImage does not glue CoreText onto ExpoImageManipulator', () => {
    const stripped = stripLinkerTokens(MESSAGES_LDFLAGS, [
      'ExpoImage',
      'Intercom',
    ]);

    expect(stripped).toContain('-framework "CoreText"');
    expect(stripped).toContain('-framework "ExpoImageManipulator"');
    expect(stripped).toContain('-framework "ExpoImagePicker"');
    expect(stripped).toContain('-framework "ExpoModulesCore"');
    expect(stripped).toContain('-framework "AppCheckInterop"');
    expect(stripped).toContain('-l"logrocket_react_native"');
    expect(stripped).not.toContain('-framework "Intercom"');
    expect(stripped).not.toContain('-l"Intercom"');
    expect(stripped).not.toContain('Intercom.modulemap');
    expect(stripped).toContain('ExpoModulesCore.modulemap');

    const names = frameworkArgv(stripped);
    expect(names).toEqual([
      'CoreText',
      'ExpoImageManipulator',
      'ExpoImagePicker',
      'ExpoModulesCore',
      'AppCheckInterop',
    ]);
    for (const name of names) {
      expect(name.includes(' ')).toBe(false);
      expect(name.includes('-framework')).toBe(false);
    }
  });

  test('post_integrate embeds whole-token framework gsub', () => {
    const hook = ensureExcludedPackagesPostIntegrate('', [
      {
        targetName: 'MessagesTarget',
        packages: ['expo-image'],
        linkerTokens: ['ExpoImage'],
      },
    ]);
    expect(hook).toContain(EXCLUDED_LINKER_STRIP_RUBY[3]);
    expect(hook).not.toMatch(
      /xc\.gsub!\(\/\\s\*-framework\\s\+"\?#\{Regexp\.escape\(token\)\}"\?\//
    );
  });
});
