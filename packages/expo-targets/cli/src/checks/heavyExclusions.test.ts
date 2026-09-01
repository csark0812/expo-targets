import { afterEach, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadProject } from '../project';
import {
  nativeUnlinkSummaries,
  warnHeavyExclusions,
} from './heavyExclusions';

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

test('warnHeavyExclusions is quiet after invert default', () => {
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
  expect(warnHeavyExclusions(loadProject(root))).toEqual([]);
});

test('nativeUnlinkSummaries reports unlink count for RN entry targets', () => {
  const root = makeProject({
    'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
    'package.json': JSON.stringify({ dependencies: {} }),
    'targets/share/expo-target.config.json': JSON.stringify({
      type: 'share',
      name: 'Share',
      platforms: ['ios'],
      entry: './targets/share/index.tsx',
    }),
    'targets/share/index.tsx':
      "import { View } from 'react-native';\nexport default function App() { return null; }\n",
  });
  expect(nativeUnlinkSummaries(loadProject(root))).toEqual([
    'Native unlink (Share): 4 packages',
  ]);
});
