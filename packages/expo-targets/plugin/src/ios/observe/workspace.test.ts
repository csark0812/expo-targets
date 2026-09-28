import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildTargetWorkspace } from './workspace';

function makeClipRoot(withAppIcon: boolean): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clip-icon-'));
  const catalog = path.join(root, 'targets', 'clip', 'ios', 'Assets.xcassets');
  fs.mkdirSync(
    withAppIcon ? path.join(catalog, 'AppIcon.appiconset') : catalog,
    { recursive: true }
  );
  return root;
}

describe('buildTargetWorkspace AppIcon catalog', () => {
  test('reports an AppIcon catalog when AppIcon.appiconset exists', () => {
    const root = makeClipRoot(true);
    try {
      const workspace = buildTargetWorkspace({
        projectRoot: root,
        platformProjectRoot: path.join(root, 'ios'),
        projectName: 'App',
        productName: 'ClipTarget',
        directory: 'targets/clip',
        type: 'clip',
      });

      expect(workspace.hasAppIconCatalog).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('reports no AppIcon catalog when the set is absent', () => {
    const root = makeClipRoot(false);
    try {
      const workspace = buildTargetWorkspace({
        projectRoot: root,
        platformProjectRoot: path.join(root, 'ios'),
        projectName: 'App',
        productName: 'ClipTarget',
        directory: 'targets/clip',
        type: 'clip',
      });

      expect(workspace.hasAppIconCatalog).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
