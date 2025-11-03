// @ts-expect-error - bun:test types
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { BuildTestRunner } from '../framework/BuildTestRunner.js';
import { MetroTester } from '../framework/MetroTester.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHARE_APP = path.resolve(__dirname, '../../../apps/share-extension');

describe('React Native Extension Rendering Tests', () => {
  const buildRunner = new BuildTestRunner();
  const validator = buildRunner.getValidator();
  const metroTester = new MetroTester();

  beforeAll(async () => {
    console.log('Setting up React Native extensions tests...');
  });

  afterAll(async () => {
    await metroTester.stopMetro();
  });

  test('Share extension has React Native entry configured', async () => {
    const result = await validator.validateTarget(
      SHARE_APP,
      'RNShare',
      'share'
    );
    expect(result.valid).toBe(true);
  });

  test('Metro config wrapper present', async () => {
    const metroConfigPath = path.join(SHARE_APP, 'metro.config.js');
    const metroConfig = await fs.readFile(metroConfigPath, 'utf-8');
    expect(metroConfig).toContain('withTargetsMetro');
  });

  test('Share extension entry point exists', async () => {
    const entryPath = path.join(SHARE_APP, 'targets/rn-share/index.tsx');
    try {
      await fs.access(entryPath);
      // File exists, test passes
    } catch {
      throw new Error(`Entry point not found at ${entryPath}`);
    }
  });

  test('Share extension config has entry field', async () => {
    const configPath = path.join(
      SHARE_APP,
      'targets/rn-share/expo-target.config.json'
    );
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(config.entry).toBeTruthy();
    expect(config.entry).toBe('./targets/rn-share/index.tsx');
  });
});
