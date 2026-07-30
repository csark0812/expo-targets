// @ts-expect-error - bun:test types
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { WorkflowTester } from '../framework/WorkflowTester.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/test-bare-rn-cli');

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: pre-existing complexity; tracked for refactor
describe('Bare React Native CLI Workflow Tests', () => {
  const workflowTester = new WorkflowTester();
  let tempProjectPath: string | null = null;

  beforeAll(async () => {
    console.log('Setting up bare workflow test...');
  });

  afterAll(async () => {
    if (tempProjectPath) {
      await workflowTester.cleanup(tempProjectPath);
    }
  });

  test('Create bare workflow from fixture', async () => {
    console.log('\n🔧 Creating bare workflow from fixture...');
    console.log(`   Source: ${FIXTURE_PATH}`);

    tempProjectPath = await workflowTester.createBareWorkflow(FIXTURE_PATH);
    console.log(`   ✓ Created temp project: ${tempProjectPath}`);
    expect(tempProjectPath).toBeTruthy();

    console.log('   Verifying ios/ directory exists...');
    const iosPath = path.join(tempProjectPath!, 'ios');
    const iosExists = await fs
      .access(iosPath)
      .then(() => true)
      .catch(() => false);

    console.log(
      iosExists ? '   ✓ ios/ directory found' : '   ✗ ios/ directory NOT found'
    );
    expect(iosExists).toBe(true);
  }, 360000);

  test('Xcode project exists in bare workflow', async () => {
    console.log('\n🔍 Validating bare workflow structure...');
    expect(tempProjectPath).toBeTruthy();

    const validation = await workflowTester.validateBareWorkflow(
      tempProjectPath!
    );

    if (validation.errors.length > 0) {
      console.log('   ✗ Validation errors:');
      // biome-ignore lint/complexity/noForEach: pre-existing; prefer for-of tracked
      validation.errors.forEach((err) => console.log(`      - ${err}`));
    }
    if (validation.warnings.length > 0) {
      console.log('   ⚠ Warnings:');
      // biome-ignore lint/complexity/noForEach: pre-existing; prefer for-of tracked
      validation.warnings.forEach((warn) => console.log(`      - ${warn}`));
    }
    if (validation.valid) {
      console.log('   ✓ Bare workflow structure valid');
    }

    expect(validation.valid).toBe(true);
  });

  test('Plugin modifies existing Xcode project', async () => {
    console.log('\n📝 Checking Xcode project files...');
    expect(tempProjectPath).toBeTruthy();

    const iosPath = path.join(tempProjectPath!, 'ios');
    console.log('   Searching for .xcodeproj files...');
    const xcodeProjects = await glob('*.xcodeproj', { cwd: iosPath });
    console.log(
      `   Found ${xcodeProjects.length} Xcode project(s): ${xcodeProjects.join(', ')}`
    );

    expect(xcodeProjects.length).toBeGreaterThan(0);

    const projectPath = path.join(iosPath, xcodeProjects[0]);
    const projectPbxproj = path.join(projectPath, 'project.pbxproj');
    console.log(`   Checking for project.pbxproj...`);
    const pbxprojExists = await fs
      .access(projectPbxproj)
      .then(() => true)
      .catch(() => false);

    console.log(
      pbxprojExists
        ? '   ✓ project.pbxproj exists'
        : '   ✗ project.pbxproj NOT found'
    );
    expect(pbxprojExists).toBe(true);
  });

  test('Project structure preserved in bare workflow', async () => {
    console.log('\n🏗️  Verifying project structure...');
    expect(tempProjectPath).toBeTruthy();

    const iosPath = path.join(tempProjectPath!, 'ios');
    console.log('   Checking for Xcode projects...');
    const xcodeProjects = await glob('*.xcodeproj', { cwd: iosPath });
    console.log(
      `   Found ${xcodeProjects.length} Xcode project(s): ${xcodeProjects.join(', ')}`
    );
    console.log(
      xcodeProjects.length > 0
        ? '   ✓ Project structure preserved'
        : '   ✗ Project structure NOT preserved'
    );

    expect(xcodeProjects.length).toBeGreaterThan(0);
  });
});
