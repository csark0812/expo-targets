import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  HOST_ONLY_EXCLUDED_PACKAGES,
  resolveExcludedPackages,
  resolveNativeUnlink,
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

describe('resolveExcludedPackages invert unused hosts', () => {
  test('unions unused autolinked hosts; user list is force-strip only', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-targets-excl-'));
    fs.mkdirSync(path.join(root, 'targets', 'messages'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'targets', 'messages', 'index.tsx'),
      "import { Image } from 'expo-image';\nexport default function App() { return null; }\n"
    );
    expect(
      resolveExcludedPackages({
        type: 'messages',
        entry: './targets/messages/index.tsx',
        projectRoot: root,
        autolinkedPackages: [
          'expo-image',
          'expo-modules-core',
          '@intercom/intercom-react-native',
          '@sentry/react-native',
        ],
        excludedPackages: ['expo-font'],
      })
    ).toEqual([
      ...HOST_ONLY_EXCLUDED_PACKAGES,
      'expo-font',
      '@intercom/intercom-react-native',
      '@sentry/react-native',
    ]);
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe('resolveExcludedPackages invert imported keep', () => {
  test('does not infer a package the entry imports', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-targets-excl-'));
    fs.mkdirSync(path.join(root, 'targets', 'messages'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'targets', 'messages', 'index.tsx'),
      "import * as Sentry from '@sentry/react-native';\nexport default function App() { return null; }\n"
    );
    expect(
      resolveExcludedPackages({
        type: 'messages',
        entry: './targets/messages/index.tsx',
        projectRoot: root,
        autolinkedPackages: ['@sentry/react-native'],
      })
    ).toEqual([...HOST_ONLY_EXCLUDED_PACKAGES]);
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe('resolveNativeUnlink linker tokens', () => {
  test('resolveNativeUnlink maps unused packages to linker tokens', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-targets-excl-'));
    fs.mkdirSync(path.join(root, 'targets', 'messages'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'targets', 'messages', 'index.tsx'),
      "import { View } from 'react-native';\nexport default function App() { return null; }\n"
    );
    const resolved = resolveNativeUnlink({
      type: 'messages',
      entry: './targets/messages/index.tsx',
      projectRoot: root,
      autolinkedPackages: [
        {
          packageName: '@intercom/intercom-react-native',
          linkerTokens: [
            '@intercom/intercom-react-native',
            'intercom-react-native',
            'Intercom',
          ],
        },
      ],
    });
    expect(resolved?.packages).toContain('@intercom/intercom-react-native');
    expect(resolved?.linkerTokens).toEqual(
      expect.arrayContaining([
        'intercom-react-native',
        'Intercom',
        '@intercom/intercom-react-native',
      ])
    );
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe('resolveNativeUnlink nativeLink host', () => {
  test('nativeLink host skips invert; user excludedPackages still strip', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-targets-excl-'));
    fs.mkdirSync(path.join(root, 'targets', 'messages'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'targets', 'messages', 'index.tsx'),
      "import { View } from 'react-native';\nexport default function App() { return null; }\n"
    );
    const host = resolveNativeUnlink({
      type: 'messages',
      entry: './targets/messages/index.tsx',
      projectRoot: root,
      nativeLink: 'host',
      autolinkedPackages: ['@intercom/intercom-react-native'],
      excludedPackages: ['expo-font'],
    });
    expect(host?.packages).toEqual([
      ...HOST_ONLY_EXCLUDED_PACKAGES,
      'expo-font',
    ]);
    expect(host?.linkerTokens).toEqual([]);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
