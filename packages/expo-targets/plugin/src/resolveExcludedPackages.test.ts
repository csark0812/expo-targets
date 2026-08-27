import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  HOST_ONLY_EXCLUDED_PACKAGES,
  resolveExcludedPackages,
} from './resolveExcludedPackages';

describe('resolveExcludedPackages omitted list', () => {
  test('omitted list → force-merges host-only packages for RN entry', () => {
    expect(
      resolveExcludedPackages({
        type: 'share',
        entry: './targets/share/index.tsx',
      })
    ).toEqual([...HOST_ONLY_EXCLUDED_PACKAGES]);
  });
});

describe('resolveExcludedPackages user extras', () => {
  test('user extras are additive; host-only always present', () => {
    expect(
      resolveExcludedPackages({
        type: 'share',
        entry: './targets/share/index.tsx',
        excludedPackages: ['react-native-reanimated'],
      })
    ).toEqual([...HOST_ONLY_EXCLUDED_PACKAGES, 'react-native-reanimated']);
  });

  test('empty array still gets host-only packages', () => {
    expect(
      resolveExcludedPackages({
        type: 'messages',
        entry: './targets/messages/index.tsx',
        excludedPackages: [],
      })
    ).toEqual([...HOST_ONLY_EXCLUDED_PACKAGES]);
  });

  test('dedupes when user already lists host-only packages', () => {
    expect(
      resolveExcludedPackages({
        type: 'action',
        entry: './targets/action/index.tsx',
        excludedPackages: ['expo-updates', 'expo-font'],
      })
    ).toEqual([
      'expo-updates',
      'expo-dev-client',
      'expo-dev-launcher',
      'expo-dev-menu',
      'expo-font',
    ]);
  });
});

describe('resolveExcludedPackages non-RN', () => {
  test('non-RN or no entry → no force-inject', () => {
    expect(
      resolveExcludedPackages({
        type: 'widget',
        excludedPackages: ['expo-updates'],
      })
    ).toEqual(['expo-updates']);

    expect(
      resolveExcludedPackages({
        type: 'share',
      })
    ).toBeUndefined();

    expect(
      resolveExcludedPackages({
        type: 'safari',
        entry: './targets/safari/popup.tsx',
      })
    ).toBeUndefined();
  });
});

describe('resolveExcludedPackages inferred heavies', () => {
  test('unions unused host Sentry when projectRoot + entry are set', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-targets-excl-'));
    fs.mkdirSync(path.join(root, 'targets', 'messages'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({
        dependencies: { '@sentry/react-native': '6.0.0' },
      })
    );
    fs.writeFileSync(
      path.join(root, 'targets', 'messages', 'index.tsx'),
      "import { View } from 'react-native';\nexport default function App() { return null; }\n"
    );
    expect(
      resolveExcludedPackages({
        type: 'messages',
        entry: './targets/messages/index.tsx',
        projectRoot: root,
      })
    ).toEqual([...HOST_ONLY_EXCLUDED_PACKAGES, '@sentry/react-native']);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('does not infer Sentry when the entry imports it', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-targets-excl-'));
    fs.mkdirSync(path.join(root, 'targets', 'messages'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({
        dependencies: { '@sentry/react-native': '6.0.0' },
      })
    );
    fs.writeFileSync(
      path.join(root, 'targets', 'messages', 'index.tsx'),
      "import * as Sentry from '@sentry/react-native';\nexport default function App() { return null; }\n"
    );
    expect(
      resolveExcludedPackages({
        type: 'messages',
        entry: './targets/messages/index.tsx',
        projectRoot: root,
      })
    ).toEqual([...HOST_ONLY_EXCLUDED_PACKAGES]);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
