import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  installExtensionBundleToRoot,
  writePublishLayout,
} from '../../../cli/src/extensionBundle/fsInstall';
import { createExtensionUpdates, fileUriToFsPath } from './ExtensionUpdates';

function makeFetchTestApi(dist: string, group: string) {
  writePublishLayout({
    distRoot: dist,
    targetName: 'ShareExt',
    type: 'share',
    runtimeVersion: '1.2.3',
    bundleBytes: Buffer.from('// share\n'),
  });

  return createExtensionUpdates({
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
}

describe('fileUriToFsPath', () => {
  test('percent-decodes Application Support after stripping file://', () => {
    const uri =
      'file:///Users/me/Library/Application%20Support/.expo-internal/abc.jsbundle';
    expect(fileUriToFsPath(uri)).toBe(
      '/Users/me/Library/Application Support/.expo-internal/abc.jsbundle'
    );
  });

  test('is a no-op for already-decoded absolute paths', () => {
    const path =
      '/Users/me/Library/Application Support/.expo-internal/abc.jsbundle';
    expect(fileUriToFsPath(path)).toBe(path);
  });
});

describe('ExtensionUpdates API (Updates-shaped)', () => {
  test('fetchUpdateAsync delegates to Updates then installs assets', async () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'eu-dist-'));
    const group = fs.mkdtempSync(path.join(os.tmpdir(), 'eu-group-'));
    try {
      const api = makeFetchTestApi(dist, group);
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

  test('default install requires appGroup', async () => {
    const api = createExtensionUpdates({
      targets: [{ targetName: 'Share', type: 'share' }],
      resolveAssetPath: async () => '/tmp/missing.jsbundle',
      getUpdates: () => ({
        runtimeVersion: '1.0.0',
        checkForUpdateAsync: async () => ({ isAvailable: false }),
        fetchUpdateAsync: async () => ({ isNew: true, manifest: {} }),
        reloadAsync: async () => {},
      }),
    });
    await expect(api.fetchUpdateAsync()).rejects.toThrow(/appGroup/);
  });
});
