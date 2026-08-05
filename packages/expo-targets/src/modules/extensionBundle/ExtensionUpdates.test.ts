import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  installExtensionBundleToRoot,
  writePublishLayout,
} from '../../../cli/src/extensionBundle/fsInstall';
import { createExtensionUpdates } from './ExtensionUpdates';

describe('ExtensionUpdates API (Updates-shaped)', () => {
  test('fetchUpdateAsync delegates to Updates then installs assets', async () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'eu-dist-'));
    const group = fs.mkdtempSync(path.join(os.tmpdir(), 'eu-group-'));
    try {
      writePublishLayout({
        distRoot: dist,
        targetName: 'ShareExt',
        type: 'share',
        runtimeVersion: '1.2.3',
        bundleBytes: Buffer.from('// share\n'),
      });

      const api = createExtensionUpdates({
        targets: [
          { targetName: 'ShareExt', type: 'share', runtimeVersion: '1.2.3' },
        ],
        resolveAssetPath: (name) =>
          path.join(dist, 'expo-targets', 'bundles', name, 'main.jsbundle'),
        install: async ({ targetName, type, runtimeVersion, localPath }) =>
          installExtensionBundleToRoot({
            appGroupRoot: group,
            targetName,
            type,
            runtimeVersion,
            sourcePath: localPath,
          }),
        getUpdates: () => ({
          runtimeVersion: '1.2.3',
          checkForUpdateAsync: async () => ({ isAvailable: true }),
          fetchUpdateAsync: async () => ({ isNew: true, manifest: {} }),
          reloadAsync: async () => {},
        }),
      });

      const check = await api.checkForUpdateAsync();
      expect(check.isAvailable).toBe(true);

      const fetched = await api.fetchUpdateAsync();
      expect(fetched.isNew).toBe(true);
      expect(fetched.installed).toHaveLength(1);
      expect(fetched.installed[0]?.runtimeVersion).toBe('1.2.3');
    } finally {
      fs.rmSync(dist, { recursive: true, force: true });
      fs.rmSync(group, { recursive: true, force: true });
    }
  });

  test('missing expo-updates returns soft reason', async () => {
    const api = createExtensionUpdates({
      targets: [],
      resolveAssetPath: () => null,
      install: async () => {
        throw new Error('should not install');
      },
      getUpdates: () => null,
    });
    const check = await api.checkForUpdateAsync();
    expect(check.isAvailable).toBe(false);
    expect(check.reason).toContain('expo-updates');
  });
});
