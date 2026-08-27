import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { writeTargetsTypesFile } from '../../../plugin/src/codegen/typedTargets';
import { loadProject } from '../project';
import { checkGeneratedTypes } from './generatedTypes';

const roots: string[] = [];

function makeProject(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-targets-types-'));
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

const shareTarget = {
  'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
  'targets/share/expo-target.config.json': JSON.stringify({
    type: 'share',
    name: 'Share',
    platforms: ['ios'],
  }),
};

describe('checkGeneratedTypes', () => {
  test('errors when .d.ts is missing', () => {
    const root = makeProject(shareTarget);
    const results = checkGeneratedTypes(loadProject(root));
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('Missing');
    expect(results[0]?.fix).toContain('expo-targets generate');
  });

  test('errors when .d.ts is stale', () => {
    const root = makeProject(shareTarget);
    writeTargetsTypesFile(root, [{ name: 'OldShare' }]);
    const results = checkGeneratedTypes(loadProject(root));
    expect(results[0]?.message).toContain('stale');
  });

  test('passes after generate-equivalent write', () => {
    const root = makeProject(shareTarget);
    writeTargetsTypesFile(root, [{ name: 'Share', type: 'share' }]);
    expect(checkGeneratedTypes(loadProject(root))).toEqual([]);
  });
});
