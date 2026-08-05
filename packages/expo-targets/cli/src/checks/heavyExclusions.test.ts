import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { warnHeavyExclusions } from './heavyExclusions';
import { loadProject } from '../project';

const roots: string[] = [];

function makeProject(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-targets-heavy-'));
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

describe('warnHeavyExclusions', () => {
  test('warns when heavy dep is unused by entry and not excluded', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'package.json': JSON.stringify({
        dependencies: { 'react-native-reanimated': '3.0.0' },
      }),
      'targets/share/expo-target.config.json': JSON.stringify({
        type: 'share',
        name: 'Share',
        platforms: ['ios'],
        entry: './targets/share/index.tsx',
      }),
      'targets/share/index.tsx':
        "import { View } from 'react-native';\nexport default function App() { return null; }\n",
    });
    const warnings = warnHeavyExclusions(loadProject(root));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('react-native-reanimated');
    expect(warnings[0]?.fix).toContain('excludedPackages');
  });

  test('quiet when entry imports the package', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'package.json': JSON.stringify({
        dependencies: { 'react-native-reanimated': '3.0.0' },
      }),
      'targets/share/expo-target.config.json': JSON.stringify({
        type: 'share',
        name: 'Share',
        platforms: ['ios'],
        entry: './targets/share/index.tsx',
      }),
      'targets/share/index.tsx':
        "import Animated from 'react-native-reanimated';\nexport default function App() { return null; }\n",
    });
    expect(warnHeavyExclusions(loadProject(root))).toEqual([]);
  });

  test('quiet when already in excludedPackages', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'package.json': JSON.stringify({
        dependencies: { 'react-native-reanimated': '3.0.0' },
      }),
      'targets/share/expo-target.config.json': JSON.stringify({
        type: 'share',
        name: 'Share',
        platforms: ['ios'],
        entry: './targets/share/index.tsx',
        excludedPackages: ['react-native-reanimated'],
      }),
      'targets/share/index.tsx':
        "import { View } from 'react-native';\nexport default function App() { return null; }\n",
    });
    expect(warnHeavyExclusions(loadProject(root))).toEqual([]);
  });
});
