import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ProjectContext } from '../types';
import { warnExtensionBundleExport } from './updateScript';

function tmpProject(scripts?: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ext-export-warn-'));
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 't', private: true, scripts: scripts ?? {} })
  );
  return root;
}

describe('warnExtensionBundleExport', () => {
  test('warns when RN entry exists without export script or assets', () => {
    const root = tmpProject();
    try {
      const ctx = {
        projectRoot: root,
        expo: {},
        plugins: [],
        hostAppGroups: [],
        targets: [
          {
            dirName: 'share',
            configPath: '',
            config: {
              type: 'share',
              name: 'Share',
              entry: './targets/share/index.tsx',
            },
          },
        ],
      } satisfies ProjectContext;
      const warnings = warnExtensionBundleExport(ctx);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.title).toContain('Extension bundle export');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('silent when update script runs export-extension-bundles', () => {
    const root = tmpProject({
      update: 'expo-targets export-extension-bundles && eas update',
    });
    try {
      const ctx = {
        projectRoot: root,
        expo: {},
        plugins: [],
        hostAppGroups: [],
        targets: [
          {
            dirName: 'share',
            configPath: '',
            config: {
              type: 'share',
              name: 'Share',
              entry: './targets/share/index.tsx',
            },
          },
        ],
      } satisfies ProjectContext;
      expect(warnExtensionBundleExport(ctx)).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
