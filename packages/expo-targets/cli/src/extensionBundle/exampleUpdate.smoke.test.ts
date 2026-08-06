import { afterEach, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { runExportExtensionBundles } from '../exportExtensionBundles';
import {
  isInstalledBundleValid,
  syncExtensionBundlesFromUpdateAssets,
} from './fsInstall';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function copyExampleTargets(
  exampleName: 'share' | 'kitchen-sink',
  into: string
): void {
  const exampleRoot = path.resolve(
    __dirname,
    '../../../../../examples',
    exampleName
  );
  const appJson = JSON.parse(
    fs.readFileSync(path.join(exampleRoot, 'app.json'), 'utf8')
  );
  fs.writeFileSync(path.join(into, 'app.json'), JSON.stringify(appJson));
  fs.writeFileSync(
    path.join(into, 'package.json'),
    JSON.stringify({ name: `smoke-${exampleName}`, private: true })
  );

  const targetsSrc = path.join(exampleRoot, 'targets');
  if (!fs.existsSync(targetsSrc)) {
    throw new Error(`missing targets in ${exampleRoot}`);
  }
  fs.cpSync(targetsSrc, path.join(into, 'targets'), { recursive: true });
}

function targetsFromWritten(written: string[]) {
  return written.map((bundlePath) => {
    const targetName = path.basename(path.dirname(bundlePath));
    const sidecar = JSON.parse(
      fs.readFileSync(
        path.join(path.dirname(bundlePath), 'manifest.json'),
        'utf8'
      )
    ) as { type: string; runtimeVersion: string };
    return {
      targetName,
      type: sidecar.type,
      runtimeVersion: sidecar.runtimeVersion,
    };
  });
}

function runExampleSmoke(
  exampleName: 'share' | 'kitchen-sink',
  runtimeVersion: string
) {
  const project = fs.mkdtempSync(
    path.join(os.tmpdir(), `smoke-${exampleName}-`)
  );
  const group = fs.mkdtempSync(
    path.join(os.tmpdir(), `smoke-${exampleName}-g-`)
  );
  roots.push(project, group);
  copyExampleTargets(exampleName, project);

  const app = JSON.parse(
    fs.readFileSync(path.join(project, 'app.json'), 'utf8')
  );
  app.expo.runtimeVersion = runtimeVersion;
  fs.writeFileSync(path.join(project, 'app.json'), JSON.stringify(app));

  const dist = path.join(project, 'dist');
  const { code, written } = runExportExtensionBundles({
    projectRoot: project,
    distRoot: dist,
    allowPlaceholder: true,
    assetsRoot: false,
  });
  return { dist, group, code, written };
}

test('simple app (share): export placeholders → sync → valid install', () => {
  const { dist, group, code, written } = runExampleSmoke(
    'share',
    'smoke-share-1'
  );
  expect(code).toBe(0);
  expect(written.length).toBeGreaterThanOrEqual(1);
  const targets = targetsFromWritten(written);
  syncExtensionBundlesFromUpdateAssets({
    updateAssetRoot: dist,
    appGroupRoot: group,
    targets,
  });
  for (const t of targets) {
    expect(
      isInstalledBundleValid({
        appGroupRoot: group,
        targetName: t.targetName,
        bakedRuntimeVersion: t.runtimeVersion,
      })
    ).toBe(true);
  }
});

test('complex app (kitchen-sink): multi RN targets export → sync', () => {
  const { dist, group, code, written } = runExampleSmoke(
    'kitchen-sink',
    'smoke-ks-1'
  );
  expect(code).toBe(0);
  expect(written.length).toBeGreaterThanOrEqual(4);
  const targets = targetsFromWritten(written);
  const installed = syncExtensionBundlesFromUpdateAssets({
    updateAssetRoot: dist,
    appGroupRoot: group,
    targets,
  });
  expect(installed.length).toBe(written.length);
});
