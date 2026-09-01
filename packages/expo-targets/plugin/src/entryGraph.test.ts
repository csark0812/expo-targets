import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { CORE_KEEP_PACKAGES, unusedAutolinkedPackages } from './entryGraph';

function makeEntry(source: string): { root: string; entry: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-targets-graph-'));
  fs.mkdirSync(path.join(root, 'targets', 'messages'), { recursive: true });
  const entry = './targets/messages/index.tsx';
  fs.writeFileSync(path.join(root, 'targets', 'messages', 'index.tsx'), source);
  return { root, entry };
}

describe('unusedAutolinkedPackages invert', () => {
  test('strips unused autolinked hosts and keeps core + entry imports', () => {
    const { root, entry } = makeEntry(
      "import { Image } from 'expo-image';\nimport { View } from 'react-native';\nexport default function App() { return null; }\n"
    );
    expect(
      unusedAutolinkedPackages({
        projectRoot: root,
        entry,
        autolinked: [
          'expo-image',
          'expo-modules-core',
          '@intercom/intercom-react-native',
          '@logrocket/react-native',
          '@sentry/react-native',
        ],
      })
    ).toEqual([
      '@intercom/intercom-react-native',
      '@logrocket/react-native',
      '@sentry/react-native',
    ]);
    expect(CORE_KEEP_PACKAGES).toContain('expo-modules-core');
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('linkedPackages stay even when the entry does not import them', () => {
    const { root, entry } = makeEntry(
      "import { View } from 'react-native';\nexport default function App() { return null; }\n"
    );
    expect(
      unusedAutolinkedPackages({
        projectRoot: root,
        entry,
        autolinked: [
          '@intercom/intercom-react-native',
          '@logrocket/react-native',
        ],
        linkedPackages: ['@intercom/intercom-react-native'],
      })
    ).toEqual(['@logrocket/react-native']);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
