import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { findOrphans } from './orphans';
import { loadProject } from './project';
import { runSync } from './sync';

const FIXTURE_PBXPROJ = path.join(
  __dirname,
  '../../plugin/__fixtures__/pbx/prebuild-stripped/project.pbxproj'
);
const FIXTURE_PODFILE = path.join(
  __dirname,
  '../../plugin/__fixtures__/podfile/plain.Podfile'
);

const roots: string[] = [];

function makeProject(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-targets-sync-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return root;
}

function scaffoldBareProject(extra: Record<string, string> = {}): string {
  return makeProject({
    'app.json': JSON.stringify({
      expo: {
        name: 'App',
        slug: 'app',
        plugins: ['expo-targets'],
        ios: {
          bundleIdentifier: 'com.example.app',
          entitlements: {
            'com.apple.security.application-groups': ['group.com.example.app'],
          },
        },
      },
    }),
    'package.json': JSON.stringify({ name: 'app', version: '1.0.0' }),
    'ios/App.xcodeproj/project.pbxproj': fs.readFileSync(
      FIXTURE_PBXPROJ,
      'utf8'
    ),
    'ios/App/AppDelegate.swift': '// AppDelegate\n',
    'ios/App/Info.plist': `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleIdentifier</key><string>com.example.app</string>
</dict></plist>
`,
    'ios/Podfile': fs.readFileSync(FIXTURE_PODFILE, 'utf8'),
    'targets/share-minimal/expo-target.config.json': JSON.stringify({
      type: 'share',
      name: 'ShareMinimal',
      platforms: ['ios'],
    }),
    ...extra,
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('runSync', () => {
  test('rejects missing ios/', async () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { name: 'App', slug: 'app' } }),
    });

    await expect(runSync({}, root)).rejects.toThrow('No ios/ directory found');
  });

  test('dry-run does not write pbxproj or sealed artifacts', async () => {
    const root = scaffoldBareProject();
    const pbxprojPath = path.join(root, 'ios/App.xcodeproj/project.pbxproj');
    const before = fs.readFileSync(pbxprojPath, 'utf8');
    const beforeMtime = fs.statSync(pbxprojPath).mtimeMs;

    const code = await runSync({ dryRun: true }, root);

    expect(code).toBe(0);
    expect(fs.readFileSync(pbxprojPath, 'utf8')).toBe(before);
    expect(fs.statSync(pbxprojPath).mtimeMs).toBe(beforeMtime);
    expect(fs.existsSync(path.join(root, 'ios/App/ExpoTargetsGenerated'))).toBe(
      false
    );
  });

  test('sync writes sealed ExpoTargetsGenerated artifacts', async () => {
    const root = scaffoldBareProject();
    const code = await runSync({}, root);

    expect(code).toBe(0);
    expect(
      fs.existsSync(
        path.join(
          root,
          'ios/App/ExpoTargetsGenerated/ShareMinimalTarget/Info.plist'
        )
      )
    ).toBe(true);
  });
});

describe('findOrphans', () => {
  test('reports sealed products without matching config', () => {
    const root = scaffoldBareProject();
    const sealedDir = path.join(
      root,
      'ios/App/ExpoTargetsGenerated/OldShareTarget'
    );
    fs.mkdirSync(sealedDir, { recursive: true });
    fs.writeFileSync(path.join(sealedDir, 'Info.plist'), '<plist/>');

    const report = findOrphans(root, loadProject(root));

    expect(report.sealedProducts).toContain('OldShareTarget');
  });
});
