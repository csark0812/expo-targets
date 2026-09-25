import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import process from 'node:process';
import { loadProject } from '../../cli/src/project';
import { evaluateTargetConfigModule } from './loadTargetConfigModule';

const TYPES_TS = `export interface HostConfig {
  name?: string;
}
`;

const HELPER_TS = `import type { HostConfig } from './types.ts';

export function withSuffix(config: HostConfig, suffix: string): string {
  return \`\${config.name ?? 'App'}.\${suffix}\`;
}
`;

const TARGET_TS = `import type { HostConfig } from './types.ts';
import { withSuffix } from './helper.ts';

export default function target(config: HostConfig) {
  return {
    type: 'share',
    name: withSuffix(config, 'Share'),
    platforms: ['ios'],
  };
}
`;

function makeRoot(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'target-config-load-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return root;
}

function typescriptFixture(): { root: string; configPath: string } {
  const root = makeRoot({
    'targets/share/types.ts': TYPES_TS,
    'targets/share/helper.ts': HELPER_TS,
    'targets/share/target.config.ts': TARGET_TS,
    'app.json': JSON.stringify({ expo: { name: 'Host' } }),
  });
  return {
    root,
    configPath: path.join(root, 'targets/share/target.config.ts'),
  };
}

function cleanEnv(
  extra: Record<string, string | undefined>
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...extra };
  delete env.NODE_OPTIONS;
  return env;
}

function nodeVersion(bin: string): string | undefined {
  const result = spawnSync(bin, ['-p', 'process.version'], {
    encoding: 'utf8',
    env: cleanEnv({}),
  });
  if (result.status !== 0) {
    return;
  }
  return result.stdout.trim();
}

function findNode2213(): string | undefined {
  const candidates = [
    process.env.EXPO_TARGETS_NODE_22_13,
    '/tmp/node-22.13/bin/node',
    'node',
  ].filter((bin): bin is string => Boolean(bin));

  for (const bin of candidates) {
    if (nodeVersion(bin)?.startsWith('v22.13.')) {
      return bin;
    }
  }
}

const node2213 = findNode2213();

const NODE_2213_RUNNER = `
const { evaluateTargetConfigModule } = require(process.env.LOADER);
if (process.env.NODE_OPTIONS) {
  throw new Error('NODE_OPTIONS leaked');
}
if (process.features.typescript) {
  throw new Error('type stripping is enabled');
}
let bare = 'loaded';
try {
  require(process.env.CONFIG);
} catch (error) {
  bare = error instanceof SyntaxError ? 'syntax' : 'other';
}
if (bare !== 'syntax') {
  throw new Error('bare require should fail');
}
const config = evaluateTargetConfigModule(process.env.CONFIG, {
  name: 'Host',
});
if (config.type !== 'share' || config.name !== 'Host.Share') {
  throw new Error('unexpected config');
}
console.log('ok');
`;

function compileLoader(outDir: string): void {
  const repoRoot = path.resolve(__dirname, '../../../..');
  const tsc = path.join(repoRoot, 'node_modules/typescript/bin/tsc');
  const compiled = spawnSync(
    process.execPath,
    [
      tsc,
      path.join(__dirname, 'loadTargetConfigModule.ts'),
      '--outDir',
      outDir,
      '--module',
      'commonjs',
      '--target',
      'ES2020',
      '--esModuleInterop',
      '--moduleResolution',
      'node',
      '--skipLibCheck',
      '--declaration',
      'false',
      '--sourceMap',
      'false',
    ],
    { encoding: 'utf8' }
  );
  if (compiled.status !== 0) {
    throw new Error(compiled.stderr || compiled.stdout);
  }
}

function runOnNode2213(nodeBin: string, configPath: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'target-config-tsc-'));
  compileLoader(dir);
  const runner = path.join(dir, 'run.cjs');
  fs.writeFileSync(runner, NODE_2213_RUNNER);
  const env = cleanEnv({
    LOADER: path.join(dir, 'loadTargetConfigModule.js'),
    CONFIG: configPath,
    NODE_PATH: path.resolve(__dirname, '../../../../node_modules'),
  });
  env.NODE_OPTIONS = '--experimental-strip-types';
  delete env.NODE_OPTIONS;

  const result = spawnSync(nodeBin, [runner], { encoding: 'utf8', env });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
  return result.stdout;
}

describe('evaluateTargetConfigModule', () => {
  test('loads a typescript config that uses import type', () => {
    const { configPath } = typescriptFixture();
    const config = evaluateTargetConfigModule(configPath, { name: 'Host' });
    expect(config).toEqual({
      type: 'share',
      name: 'Host.Share',
      platforms: ['ios'],
    });
  });

  test('still loads json and javascript configs', () => {
    const root = makeRoot({
      'targets/share/target.config.json': JSON.stringify({
        type: 'share',
        name: 'JsonShare',
      }),
      'targets/action/target.config.js':
        'module.exports = { type: "action", name: "JsAction" };\n',
    });

    expect(
      evaluateTargetConfigModule(
        path.join(root, 'targets/share/target.config.json'),
        {}
      )
    ).toMatchObject({ name: 'JsonShare' });
    expect(
      evaluateTargetConfigModule(
        path.join(root, 'targets/action/target.config.js'),
        {}
      )
    ).toMatchObject({ name: 'JsAction' });
  });
});

describe('target config callers', () => {
  test('cli loadProject reads a typescript target config', () => {
    const { root } = typescriptFixture();
    const project = loadProject(root);
    expect(project.targets).toHaveLength(1);
    expect(project.targets[0]?.config).toMatchObject({
      type: 'share',
      name: 'Host.Share',
    });
  });

  test('plugin and cli evaluate configs through the typescript loader', () => {
    const pluginSource = fs.readFileSync(
      path.join(__dirname, 'withTargetsDir.ts'),
      'utf8'
    );
    const cliSource = fs.readFileSync(
      path.join(__dirname, '../../cli/src/project.ts'),
      'utf8'
    );
    expect(pluginSource).toContain('evaluateTargetConfigModule(');
    expect(pluginSource).not.toContain('require(targetPath)');
    expect(cliSource).toContain('evaluateTargetConfigModule');
    expect(cliSource).not.toContain('require(configPath)');
  });
});

describe('node 22.13', () => {
  test('requires a typescript config without NODE_OPTIONS', () => {
    if (!node2213) {
      if (process.env.CI) {
        throw new Error(
          'CI must run this regression on Node 22.13.0 without NODE_OPTIONS.'
        );
      }
      return;
    }

    const { configPath } = typescriptFixture();
    expect(runOnNode2213(node2213, configPath)).toContain('ok');
  });
});
