import { execa } from 'execa';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { TestResult, TestSuite, BuildConfig } from './types.js';
import { XcodeHelper } from './XcodeHelper.js';
import { PrebuildValidator } from './PrebuildValidator.js';
import { RuntimeTester } from './RuntimeTester.js';

export class BuildTestRunner {
  private xcodeHelper: XcodeHelper;
  private validator: PrebuildValidator;
  private runtimeTester: RuntimeTester;

  constructor() {
    this.xcodeHelper = new XcodeHelper();
    this.validator = new PrebuildValidator();
    this.runtimeTester = new RuntimeTester();
  }

  async runPrebuild(projectPath: string): Promise<{ success: boolean; output: string }> {
    try {
      const result = await execa('npx', ['expo', 'prebuild', '--clean'], {
        cwd: projectPath,
        reject: false
      });

      return {
        success: result.exitCode === 0,
        output: result.stdout + result.stderr
      };
    } catch (error) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async testPrebuildGeneratesProject(projectPath: string): Promise<TestResult> {
    const startTime = Date.now();
    const testName = 'Prebuild generates Xcode project';

    try {
      const prebuildResult = await this.runPrebuild(projectPath);
      if (!prebuildResult.success) {
        throw new Error('Prebuild failed: ' + prebuildResult.output);
      }

      const validation = await this.validator.validateProjectStructure(projectPath);
      if (!validation.valid) {
        throw new Error('Invalid project structure: ' + validation.errors.join(', '));
      }

      return {
        name: testName,
        passed: true,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  async testTargetCreation(
    projectPath: string,
    targetName: string,
    targetType: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    const testName = `Target ${targetName} created correctly`;

    try {
      const validation = await this.validator.validateTarget(projectPath, targetName, targetType);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      const iosPath = path.join(projectPath, 'ios');
      const project = await this.xcodeHelper.findProject(iosPath);

      const hasTarget = project.targets.some(t =>
        t.toLowerCase().includes(targetName.toLowerCase())
      );

      if (!hasTarget) {
        throw new Error(`Target ${targetName} not found in Xcode project`);
      }

      return {
        name: testName,
        passed: true,
        duration: Date.now() - startTime,
        details: `Warnings: ${validation.warnings.join(', ') || 'none'}`
      };
    } catch (error) {
      return {
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  async testBuildSucceeds(config: BuildConfig): Promise<TestResult> {
    const startTime = Date.now();
    const testName = `Build ${config.scheme} (${config.configuration})`;

    try {
      await this.xcodeHelper.clean(config);
      const buildResult = await this.xcodeHelper.build(config);

      if (!buildResult.success) {
        throw new Error('Build failed');
      }

      return {
        name: testName,
        passed: true,
        duration: Date.now() - startTime,
        details: `Build time: ${(buildResult.duration / 1000).toFixed(1)}s`
      };
    } catch (error) {
      return {
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  async testEntitlementsSync(projectPath: string, targetName: string): Promise<TestResult> {
    const startTime = Date.now();
    const testName = `App Groups synced for ${targetName}`;

    try {
      const validation = await this.validator.validateAppGroups(projectPath);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      const entitlements = await this.validator.validateEntitlements(projectPath, targetName);
      if (!entitlements.valid) {
        throw new Error(entitlements.errors.join(', '));
      }

      return {
        name: testName,
        passed: true,
        duration: Date.now() - startTime,
        details: entitlements.warnings.join(', ') || 'All checks passed'
      };
    } catch (error) {
      return {
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  async testAssetsGenerated(projectPath: string, targetName: string): Promise<TestResult> {
    const startTime = Date.now();
    const testName = `Assets generated for ${targetName}`;

    try {
      const validation = await this.validator.validateAssets(projectPath, targetName);

      return {
        name: testName,
        passed: true,
        duration: Date.now() - startTime,
        details: validation.warnings.length > 0
          ? `Warnings: ${validation.warnings.join(', ')}`
          : 'All assets present'
      };
    } catch (error) {
      return {
        name: testName,
        passed: false,
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  getXcodeHelper(): XcodeHelper {
    return this.xcodeHelper;
  }

  getValidator(): PrebuildValidator {
    return this.validator;
  }

  getRuntimeTester(): RuntimeTester {
    return this.runtimeTester;
  }
}

