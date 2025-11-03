// @ts-expect-error - bun:test types
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { WorkflowTester } from '../framework/WorkflowTester.js';
import { BuildTestRunner } from '../framework/BuildTestRunner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(
  __dirname,
  '../fixtures/test-managed-minimal'
);
const WIDGET_APP = path.resolve(__dirname, '../../../apps/widget-interactive');

describe('Managed Workflow Tests', () => {
  const workflowTester = new WorkflowTester();
  const buildRunner = new BuildTestRunner();
  const validator = buildRunner.getValidator();
  let tempProjectPath: string | null = null;

  beforeAll(async () => {
    console.log('Setting up managed workflow test...');
  });

  afterAll(async () => {
    if (tempProjectPath) {
      await workflowTester.cleanup(tempProjectPath);
    }
  });

  test('Create managed workflow from fixture', async () => {
    console.log('\n🔧 Creating managed workflow from fixture...');
    console.log(`   Source: ${FIXTURE_PATH}`);

    tempProjectPath = await workflowTester.createManagedWorkflow(FIXTURE_PATH);
    console.log(`   ✓ Created temp project: ${tempProjectPath}`);
    expect(tempProjectPath).toBeTruthy();

    console.log('   Verifying app.json exists...');
    const appJsonPath = path.join(tempProjectPath!, 'app.json');
    const appJsonExists = await fs
      .access(appJsonPath)
      .then(() => true)
      .catch(() => false);

    console.log(
      appJsonExists ? '   ✓ app.json found' : '   ✗ app.json NOT found'
    );
    expect(appJsonExists).toBe(true);
  }, 360000);

  test('expo-targets plugin configured in app.json', async () => {
    console.log('\n🔍 Validating managed workflow configuration...');
    expect(tempProjectPath).toBeTruthy();

    const validation = await workflowTester.validateManagedWorkflow(
      tempProjectPath!
    );

    if (validation.errors.length > 0) {
      console.log('   ✗ Validation errors:');
      validation.errors.forEach((err) => console.log(`      - ${err}`));
    }
    if (validation.warnings.length > 0) {
      console.log('   ⚠ Warnings:');
      validation.warnings.forEach((warn) => console.log(`      - ${warn}`));
    }
    if (validation.valid) {
      console.log('   ✓ Configuration valid');
    }

    expect(validation.valid).toBe(true);
  });

  test('expo prebuild generates iOS project', async () => {
    console.log('\n🔨 Running expo prebuild...');
    expect(tempProjectPath).toBeTruthy();

    const iosPath = path.join(tempProjectPath!, 'ios');
    console.log('   Cleaning existing ios/ directory...');
    await fs.rm(iosPath, { recursive: true, force: true }).catch(() => {});

    console.log('   Running expo prebuild (this may take a while)...');
    const prebuildSuccess = await workflowTester.runExpoPrebuild(
      tempProjectPath!
    );
    console.log(
      prebuildSuccess ? '   ✓ Prebuild succeeded' : '   ✗ Prebuild FAILED'
    );
    expect(prebuildSuccess).toBe(true);

    console.log('   Verifying ios/ directory created...');
    const iosExists = await fs
      .access(iosPath)
      .then(() => true)
      .catch(() => false);
    console.log(
      iosExists ? '   ✓ ios/ directory exists' : '   ✗ ios/ directory NOT found'
    );
    expect(iosExists).toBe(true);
  }, 150000);

  test('Target discovered and created', async () => {
    console.log('\n🎯 Validating target creation...');
    console.log('   Target: TestWidget (widget)');
    expect(tempProjectPath).toBeTruthy();

    const result = await validator.validateTarget(
      tempProjectPath!,
      'TestWidget',
      'widget'
    );

    if (result.errors.length > 0) {
      console.log('   ✗ Target validation errors:');
      result.errors.forEach((err) => console.log(`      - ${err}`));
    }
    if (result.warnings.length > 0) {
      console.log('   ⚠ Warnings:');
      result.warnings.forEach((warn) => console.log(`      - ${warn}`));
    }
    if (result.valid) {
      console.log('   ✓ Target valid');
    }

    expect(result.valid).toBe(true);
  });

  test('App Groups configured correctly', async () => {
    console.log('\n📦 Validating App Groups configuration...');
    expect(tempProjectPath).toBeTruthy();

    const result = await validator.validateAppGroups(tempProjectPath!);

    if (result.errors.length > 0) {
      console.log('   ✗ App Groups errors:');
      result.errors.forEach((err) => console.log(`      - ${err}`));
    }
    if (result.warnings.length > 0) {
      console.log('   ⚠ Warnings:');
      result.warnings.forEach((warn) => console.log(`      - ${warn}`));
    }
    if (result.valid) {
      console.log('   ✓ App Groups configured correctly');
    }

    expect(result.valid).toBe(true);
  });

  test('Xcode project structure valid', async () => {
    console.log('\n🏗️  Validating Xcode project structure...');
    expect(tempProjectPath).toBeTruthy();

    const result = await validator.validateProjectStructure(tempProjectPath!);

    if (result.errors.length > 0) {
      console.log('   ✗ Project structure errors:');
      result.errors.forEach((err) => console.log(`      - ${err}`));
    }
    if (result.warnings.length > 0) {
      console.log('   ⚠ Warnings:');
      result.warnings.forEach((warn) => console.log(`      - ${warn}`));
    }
    if (result.valid) {
      console.log('   ✓ Project structure valid');
    }

    expect(result.valid).toBe(true);
  });

  test('Real app (widget-interactive) prebuild works', async () => {
    console.log('\n🚀 Testing real app prebuild (widget-interactive)...');
    console.log(`   App path: ${WIDGET_APP}`);

    const iosPath = path.join(WIDGET_APP, 'ios');
    const iosExists = await fs
      .access(iosPath)
      .then(() => true)
      .catch(() => false);

    if (iosExists) {
      console.log('   Cleaning existing ios/ directory...');
      await fs.rm(iosPath, { recursive: true, force: true });
    }

    console.log('   Running expo prebuild on real app...');
    const prebuildSuccess = await workflowTester.runExpoPrebuild(WIDGET_APP);
    console.log(
      prebuildSuccess
        ? '   ✓ Real app prebuild succeeded'
        : '   ✗ Real app prebuild FAILED'
    );
    expect(prebuildSuccess).toBe(true);
  }, 150000);
});
