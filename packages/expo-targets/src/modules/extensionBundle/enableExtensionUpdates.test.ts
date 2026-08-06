import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  installExtensionBundleToRoot,
  writePublishLayout,
} from '../../../cli/src/extensionBundle/fsInstall';
import { ExtensionUpdates } from './ExtensionUpdatesApi';
import { enableExtensionUpdates } from './enableExtensionUpdates';

function makeEnableTestHandle(dist: string, group: string) {
  writePublishLayout({
    distRoot: dist,
    targetName: 'Share',
    type: 'share',
    runtimeVersion: '9.9.9',
    bundleBytes: Buffer.from('// enable\n'),
  });

  let synced = false;
  const handle = enableExtensionUpdates({
    appGroup: 'group.test',
    targets: [{ targetName: 'Share', type: 'share' }],
    syncOnStart: false,
    resolveAssetPath: async (name) =>
      path.join(dist, 'expo-targets', 'bundles', name, 'main.jsbundle'),
    install: async ({ targetName, type, runtimeVersion, localPath }) => {
      synced = true;
      return installExtensionBundleToRoot({
        appGroupRoot: group,
        targetName,
        type,
        runtimeVersion,
        sourcePath: localPath,
      });
    },
    getUpdates: () => ({
      runtimeVersion: '9.9.9',
      checkForUpdateAsync: async () => ({ isAvailable: false }),
      fetchUpdateAsync: async () => ({ isNew: false }),
      reloadAsync: async () => {},
    }),
  });

  return { handle, synced: () => synced };
}

describe('enableExtensionUpdates', () => {
  test('syncs on start from injected install', async () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'enable-dist-'));
    const group = fs.mkdtempSync(path.join(os.tmpdir(), 'enable-group-'));
    try {
      const { handle, synced } = makeEnableTestHandle(dist, group);
      expect(handle.enabled).toBe(true);
      if (handle.enabled) {
        await handle.syncFromCurrentUpdate();
      }
      expect(synced()).toBe(true);
    } finally {
      fs.rmSync(dist, { recursive: true, force: true });
      fs.rmSync(group, { recursive: true, force: true });
    }
  });

  test('returns disabled when no targets', () => {
    const handle = enableExtensionUpdates({
      targets: [],
      appGroup: 'group.test',
      syncOnStart: false,
    });
    expect(handle.enabled).toBe(false);
  });

  test('ExtensionUpdates.enable is the same entry', () => {
    expect(ExtensionUpdates.enable).toBe(enableExtensionUpdates);
    expect(typeof ExtensionUpdates.create).toBe('function');
  });
});
