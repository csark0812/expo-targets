import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, describe, expect, test } from 'bun:test';

import {
  EXTENSION_BUNDLE_MAX_BYTES,
  maxBytesForType,
} from './constants';
import {
  clearExtensionBundleFromRoot,
  getExtensionBundleInfoFromRoot,
  installExtensionBundleToRoot,
  isInstalledBundleValid,
  syncExtensionBundlesFromUpdateAssets,
  writePublishLayout,
} from './fsInstall';

const roots: string[] = [];

function tmp(): string {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'ext-bundle-'));
  roots.push(dir);
  return dir;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('extension bundle caps', () => {
  test('share cap is 5 MiB; clip is 8 MiB', () => {
    expect(maxBytesForType('share')).toBe(5 * 1024 * 1024);
    expect(maxBytesForType('clip')).toBe(8 * 1024 * 1024);
    expect(EXTENSION_BUNDLE_MAX_BYTES.messages).toBe(5 * 1024 * 1024);
  });

  test('unknown type throws', () => {
    expect(() => maxBytesForType('widget')).toThrow(/No sideload size cap/);
  });
});

describe('publish → sync smoke (simple share)', () => {
  test('export layout then sync into app group root', () => {
    const dist = tmp();
    const group = tmp();
    const bytes = Buffer.from('// share hermes-shaped fixture\n');
    writePublishLayout({
      distRoot: dist,
      targetName: 'ShareExt',
      type: 'share',
      runtimeVersion: '1.0.0',
      bundleBytes: bytes,
    });

    const installed = syncExtensionBundlesFromUpdateAssets({
      updateAssetRoot: dist,
      appGroupRoot: group,
      targets: [
        { targetName: 'ShareExt', type: 'share', runtimeVersion: '1.0.0' },
      ],
    });

    expect(installed).toHaveLength(1);
    expect(installed[0]?.sha256).toBe(
      createHash('sha256').update(bytes).digest('hex')
    );
    expect(
      isInstalledBundleValid({
        appGroupRoot: group,
        targetName: 'ShareExt',
        bakedRuntimeVersion: '1.0.0',
      })
    ).toBe(true);
    expect(
      isInstalledBundleValid({
        appGroupRoot: group,
        targetName: 'ShareExt',
        bakedRuntimeVersion: '9.9.9',
      })
    ).toBe(false);
  });

  test('rejects oversize and missing runtimeVersion', () => {
    const group = tmp();
    const src = path.join(tmp(), 'big.jsbundle');
    fs.writeFileSync(src, Buffer.alloc(5 * 1024 * 1024 + 1));
    expect(() =>
      installExtensionBundleToRoot({
        appGroupRoot: group,
        targetName: 'ShareExt',
        type: 'share',
        runtimeVersion: '1.0.0',
        sourcePath: src,
      })
    ).toThrow(/max for type/);

    const small = path.join(tmp(), 'ok.jsbundle');
    fs.writeFileSync(small, 'ok');
    expect(() =>
      installExtensionBundleToRoot({
        appGroupRoot: group,
        targetName: 'ShareExt',
        type: 'share',
        runtimeVersion: '',
        sourcePath: small,
      })
    ).toThrow(/runtimeVersion is required/);
  });
});

describe('publish → sync smoke (complex multi-target)', () => {
  test('kitchen-sink style: share + messages + action', () => {
    const dist = tmp();
    const group = tmp();
    const targets = [
      { targetName: 'Share', type: 'share', runtimeVersion: '2.0.0' },
      { targetName: 'Messages', type: 'messages', runtimeVersion: '2.0.0' },
      { targetName: 'Action', type: 'action', runtimeVersion: '2.0.0' },
    ] as const;

    for (const t of targets) {
      writePublishLayout({
        distRoot: dist,
        targetName: t.targetName,
        type: t.type,
        runtimeVersion: t.runtimeVersion,
        bundleBytes: Buffer.from(`// ${t.targetName}\n`),
      });
    }

    const installed = syncExtensionBundlesFromUpdateAssets({
      updateAssetRoot: dist,
      appGroupRoot: group,
      targets: [...targets],
    });
    expect(installed).toHaveLength(3);

    for (const t of targets) {
      expect(
        isInstalledBundleValid({
          appGroupRoot: group,
          targetName: t.targetName,
          bakedRuntimeVersion: '2.0.0',
        })
      ).toBe(true);
      const info = getExtensionBundleInfoFromRoot(group, t.targetName);
      expect(info?.type).toBe(t.type);
    }

    clearExtensionBundleFromRoot(group, 'Messages');
    expect(getExtensionBundleInfoFromRoot(group, 'Messages')).toBeNull();
    expect(
      isInstalledBundleValid({
        appGroupRoot: group,
        targetName: 'Share',
        bakedRuntimeVersion: '2.0.0',
      })
    ).toBe(true);
  });
});
