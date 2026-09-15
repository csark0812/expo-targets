import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  discoverTargetConfigFiles,
  isLegacyTargetConfigPath,
} from './targetConfigFile';

const roots: string[] = [];

function makeRoot(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'target-config-file-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('discoverTargetConfigFiles', () => {
  test('finds target.config.json', () => {
    const root = makeRoot({
      'targets/share/target.config.json': '{"type":"share","name":"Share"}',
    });
    expect(
      discoverTargetConfigFiles({ targetsRoot: './targets', cwd: root })
    ).toEqual([path.join(root, 'targets/share/target.config.json')]);
  });

  test('falls back to expo-target.config.json', () => {
    const root = makeRoot({
      'targets/share/expo-target.config.json':
        '{"type":"share","name":"Share"}',
    });
    expect(
      discoverTargetConfigFiles({ targetsRoot: './targets', cwd: root })
    ).toEqual([path.join(root, 'targets/share/expo-target.config.json')]);
  });

  test('prefers target.config.json when both exist', () => {
    const root = makeRoot({
      'targets/share/expo-target.config.json':
        '{"type":"share","name":"Legacy"}',
      'targets/share/target.config.json': '{"type":"share","name":"Current"}',
    });
    expect(
      discoverTargetConfigFiles({ targetsRoot: './targets', cwd: root })
    ).toEqual([path.join(root, 'targets/share/target.config.json')]);
  });
});

test('isLegacyTargetConfigPath', () => {
  expect(
    isLegacyTargetConfigPath('/app/targets/share/expo-target.config.ts')
  ).toBe(true);
  expect(
    isLegacyTargetConfigPath('/app/targets/share/target.config.json')
  ).toBe(false);
});
