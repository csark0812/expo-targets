import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  exportTargetHermesBundle,
  writeExtensionBundleAssetModules,
} from './hermesExport';
import { runExportExtensionBundles } from '../exportExtensionBundles';

describe('hermesExport', () => {
  test('exportTargetHermesBundle invokes expo export:embed --bytecode', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-entry-'));
    try {
      const entry = path.join(root, 'targets', 'share', 'index.tsx');
      fs.mkdirSync(path.dirname(entry), { recursive: true });
      fs.writeFileSync(entry, 'export default () => null;\n');
      const out = path.join(root, 'out', 'main.jsbundle');
      let seen: string[] = [];
      exportTargetHermesBundle({
        projectRoot: root,
        entryFile: 'targets/share/index.tsx',
        bundleOutput: out,
        run: (_cmd, args) => {
          seen = args;
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, Buffer.from([0xc0, 0xde]));
          return {
            status: 0,
            pid: 1,
            output: [],
            stdout: '',
            stderr: '',
            signal: null,
          };
        },
      });
      expect(seen).toContain('export:embed');
      expect(seen).toContain('--bytecode');
      expect(seen).toContain('--unstable-transform-profile');
      expect(seen).toContain('hermes');
      expect(fs.existsSync(out)).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('writeExtensionBundleAssetModules emits require map', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-assets-'));
    try {
      const out = writeExtensionBundleAssetModules({
        assetsRoot: root,
        targetNames: ['Share', 'Action'],
      });
      const body = fs.readFileSync(out, 'utf8');
      expect(body).toContain('require("./bundles/Share/main.jsbundle")');
      expect(body).toContain('require("./bundles/Action/main.jsbundle")');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('runExportExtensionBundles uses Hermes runner when not placeholder', () => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-proj-'));
    try {
      fs.writeFileSync(
        path.join(project, 'app.json'),
        JSON.stringify({
          expo: {
            name: 't',
            slug: 't',
            runtimeVersion: '1.0.0',
            ios: {
              entitlements: {
                'com.apple.security.application-groups': ['group.t'],
              },
            },
          },
        })
      );
      fs.writeFileSync(
        path.join(project, 'package.json'),
        JSON.stringify({ name: 't', private: true })
      );
      const targetDir = path.join(project, 'targets', 'share');
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(
        path.join(targetDir, 'expo-target.config.json'),
        JSON.stringify({
          type: 'share',
          name: 'Share',
          entry: './targets/share/index.tsx',
        })
      );
      fs.writeFileSync(
        path.join(targetDir, 'index.tsx'),
        'export default () => null;\n'
      );

      const dist = path.join(project, 'dist');
      const assets = path.join(project, 'assets', 'expo-targets');
      const { code, written, assetModulesPath } = runExportExtensionBundles({
        projectRoot: project,
        distRoot: dist,
        assetsRoot: assets,
        hermes: true,
        runHermes: (_cmd, args) => {
          const bundleArgIdx = args.indexOf('--bundle-output');
          const out = args[bundleArgIdx + 1];
          if (out) {
            fs.mkdirSync(path.dirname(out), { recursive: true });
            fs.writeFileSync(out, Buffer.from('// hermes fake\n'));
          }
          return {
            status: 0,
            pid: 1,
            output: [],
            stdout: '',
            stderr: '',
            signal: null,
          };
        },
      });
      expect(code).toBe(0);
      expect(written.length).toBe(1);
      expect(
        fs.existsSync(path.join(assets, 'bundles', 'Share', 'main.jsbundle'))
      ).toBe(true);
      expect(assetModulesPath).toBe(
        path.join(assets, 'extensionBundleModules.js')
      );
    } finally {
      fs.rmSync(project, { recursive: true, force: true });
    }
  });
});
