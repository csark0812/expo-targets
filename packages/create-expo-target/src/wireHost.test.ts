import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  ensureAppGroupOnExpo,
  ensurePluginOnExpo,
  findJsonExpoConfig,
} from './expoConfigIO';
import { wireExpoConfig } from './wireExpoConfig';
import { wireHost } from './wireHost';
import { wireMetroConfig } from './wireMetro';
import { ensureExpoTargetsDependency } from './wirePackageJson';

function makeTempProject(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'create-expo-target-'));
}

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('ensureExpoTargetsDependency', () => {
  test('adds expo-targets when missing', () => {
    const root = makeTempProject();
    tempRoots.push(root);
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'test-app' })
    );

    const added = ensureExpoTargetsDependency(root);
    expect(added).toBe(true);
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8')
    );
    expect(pkg.dependencies['expo-targets']).toBe('*');
  });

  test('does not overwrite existing expo-targets dependency', () => {
    const root = makeTempProject();
    tempRoots.push(root);
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({
        name: 'test-app',
        dependencies: { 'expo-targets': '0.2.9' },
      })
    );

    const added = ensureExpoTargetsDependency(root);
    expect(added).toBe(false);
  });
});

describe('wireExpoConfig adds plugin', () => {
  test('adds plugin and app group to app.json', () => {
    const root = makeTempProject();
    tempRoots.push(root);
    fs.writeFileSync(
      path.join(root, 'app.json'),
      JSON.stringify({
        expo: {
          name: 'Test',
          slug: 'test',
          ios: { bundleIdentifier: 'com.example.app' },
        },
      })
    );

    const result = wireExpoConfig(root);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.pluginAdded).toBe(true);
    expect(result.appGroupAdded).toBe(true);

    const config = findJsonExpoConfig(root);
    expect(config?.expo.plugins).toEqual(['expo-targets']);
    const ios = config?.expo.ios as Record<string, unknown>;
    const entitlements = ios.entitlements as Record<string, string[]>;
    expect(entitlements['com.apple.security.application-groups']).toEqual([
      'group.com.example.app',
    ]);
  });
});

describe('wireExpoConfig preserves groups', () => {
  test('does not overwrite existing app groups', () => {
    const root = makeTempProject();
    tempRoots.push(root);
    const expo = {
      name: 'Test',
      slug: 'test',
      ios: {
        bundleIdentifier: 'com.example.app',
        entitlements: {
          'com.apple.security.application-groups': ['group.custom'],
        },
      },
      plugins: ['expo-targets'],
    };
    fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify({ expo }));

    const added = ensureAppGroupOnExpo(expo, 'group.com.example.app');
    expect(added).toBe(false);
    expect(ensurePluginOnExpo(expo)).toBe(false);
  });
});

describe('wireExpoConfig dynamic config', () => {
  test('fails for app.config.js with snippet', () => {
    const root = makeTempProject();
    tempRoots.push(root);
    fs.writeFileSync(
      path.join(root, 'app.config.js'),
      'module.exports = {};\n'
    );

    const result = wireExpoConfig(root);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.snippet).toContain('expo-targets');
  });
});

describe('wireMetroConfig', () => {
  test('creates metro.config.js when missing', () => {
    const root = makeTempProject();
    tempRoots.push(root);

    const result = wireMetroConfig(root);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.created).toBe(true);
    const content = fs.readFileSync(path.join(root, 'metro.config.js'), 'utf8');
    expect(content).toContain('withTargets');
  });

  test('patches simple metro export', () => {
    const root = makeTempProject();
    tempRoots.push(root);
    fs.writeFileSync(
      path.join(root, 'metro.config.js'),
      `const { getDefaultConfig } = require('expo/metro-config');
module.exports = getDefaultConfig(__dirname);
`
    );

    const result = wireMetroConfig(root);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.patched).toBe(true);
    const content = fs.readFileSync(path.join(root, 'metro.config.js'), 'utf8');
    expect(content).toContain('withTargets(getDefaultConfig(__dirname))');
  });

  test('skips when already wrapped', () => {
    const root = makeTempProject();
    tempRoots.push(root);
    fs.writeFileSync(
      path.join(root, 'metro.config.js'),
      `const { withTargets } = require('expo-targets/metro');
module.exports = withTargets({});
`
    );

    const result = wireMetroConfig(root);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.patched).toBeUndefined();
    expect(result.created).toBeUndefined();
  });
});

describe('wireHost', () => {
  test('wires package.json, app.json, and metro together', () => {
    const root = makeTempProject();
    tempRoots.push(root);
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'test-app' })
    );
    fs.writeFileSync(
      path.join(root, 'app.json'),
      JSON.stringify({
        expo: {
          name: 'Test',
          slug: 'test',
          ios: { bundleIdentifier: 'com.example.host' },
        },
      })
    );

    const result = wireHost(root);
    expect(result.dependencyAdded).toBe(true);
    expect(result.expo.ok).toBe(true);
    expect(result.metro.ok).toBe(true);
  });
});
