import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { exportSafariWebBundle } from './exportSafariWebBundle';

const originalEnv = process.env.SKIP_SAFARI_EXPORT;

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env.SKIP_SAFARI_EXPORT;
  } else {
    process.env.SKIP_SAFARI_EXPORT = originalEnv;
  }
});

describe('exportSafariWebBundle', () => {
  test('skips when SKIP_SAFARI_EXPORT=1', () => {
    process.env.SKIP_SAFARI_EXPORT = '1';
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'et-safari-'));
    const platformProjectRoot = path.join(projectRoot, 'ios');

    const result = exportSafariWebBundle({
      projectRoot,
      platformProjectRoot,
      projectName: 'App',
      target: {
        entryFile: 'targets/safari/index.tsx',
        productName: 'MySafariTarget',
      },
    });

    expect(result.skipped).toBe(true);
    expect(result.popupJsPath).toContain('popup.js');
  });

  test('skips when popup.js is newer than entry', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'et-safari-'));
    const entryPath = path.join(projectRoot, 'targets/safari/index.tsx');
    const popupPath = path.join(
      projectRoot,
      'ios',
      'App',
      'ExpoTargetsGenerated',
      'MySafariTarget',
      'Resources',
      'popup.js'
    );

    fs.mkdirSync(path.dirname(entryPath), { recursive: true });
    fs.mkdirSync(path.dirname(popupPath), { recursive: true });
    fs.writeFileSync(entryPath, 'console.log("entry");\n');
    fs.writeFileSync(popupPath, 'console.log("popup");\n');

    const entryMtime = Date.now() - 5_000;
    fs.utimesSync(entryPath, entryMtime / 1000, entryMtime / 1000);

    const result = exportSafariWebBundle({
      projectRoot,
      platformProjectRoot: path.join(projectRoot, 'ios'),
      projectName: 'App',
      target: {
        entryFile: 'targets/safari/index.tsx',
        productName: 'MySafariTarget',
      },
    });

    expect(result.skipped).toBe(true);
    expect(fs.readFileSync(popupPath, 'utf8')).toContain('popup');
  });
});
