import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execa } from 'execa';
import type { ValidationResult } from './types.js';
import { PrebuildValidator } from './PrebuildValidator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class WorkflowTester {
  private validator: PrebuildValidator;

  constructor() {
    this.validator = new PrebuildValidator();
  }

  async createManagedWorkflow(fixturePath: string): Promise<string> {
    console.log('   📁 Setting up managed workflow...');
    const tempDir = path.join(
      '/tmp',
      `expo-targets-test-managed-${Date.now()}`
    );
    console.log(`   Creating temp directory: ${tempDir}`);
    await fs.mkdir(tempDir, { recursive: true });

    console.log('   Copying fixture files...');
    await this.copyDirectory(fixturePath, tempDir);
    console.log('   ✓ Fixture files copied');

    // Update package.json to use workspace or file reference for expo-targets
    console.log('   Configuring package.json...');
    const packageJsonPath = path.join(tempDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    // Link to local expo-targets package
    const repoRoot = path.resolve(__dirname, '../../..');
    const expoTargetsPath = path.join(repoRoot, 'packages', 'expo-targets');
    console.log(`   Linking to local expo-targets: ${expoTargetsPath}`);

    // Build expo-targets if not already built
    const pluginBuildPath = path.join(
      expoTargetsPath,
      'plugin',
      'build',
      'index.js'
    );
    const mainBuildPath = path.join(
      expoTargetsPath,
      'build',
      'src',
      'index.js'
    );
    const appPluginPath = path.join(expoTargetsPath, 'app.plugin.js');

    const needsBuild = !(
      await Promise.all([
        fs
          .access(pluginBuildPath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(mainBuildPath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(appPluginPath)
          .then(() => true)
          .catch(() => false),
      ])
    ).every(Boolean);

    if (needsBuild) {
      // Always ensure expo-targets dependencies are installed and up to date
      console.log('   🔧 expo-targets needs building...');
      console.log(
        '   Installing expo-targets dependencies (this may take a while)...'
      );
      try {
        const installResult = await execa('npm', ['install'], {
          cwd: expoTargetsPath,
          reject: false,
          timeout: 300000,
        });

        // Check if process was killed or timed out
        if (
          installResult.exitCode === undefined ||
          installResult.exitCode === null
        ) {
          // Check if node_modules exists despite timeout
          const nodeModulesPath = path.join(expoTargetsPath, 'node_modules');
          const hasNodeModules = await fs
            .access(nodeModulesPath)
            .then(() => true)
            .catch(() => false);

          if (!hasNodeModules) {
            throw new Error(
              'npm install was killed or timed out and node_modules was not created.'
            );
          }
          // If node_modules exists, assume install succeeded despite timeout
          console.log(
            '   ⚠ npm install timed out but node_modules exists, continuing...'
          );
        } else if (installResult.exitCode !== 0) {
          console.error(
            'expo-targets npm install failed - exit code:',
            installResult.exitCode
          );
          console.error('npm install stdout:', installResult.stdout);
          console.error('npm install stderr:', installResult.stderr);
          throw new Error(
            `Failed to install expo-targets dependencies: ${installResult.stderr || installResult.stdout}`
          );
        }
      } catch (error: any) {
        // Re-throw if it's already our formatted error
        if (error.message && error.message.includes('Failed to install')) {
          throw error;
        }
        // Otherwise check if node_modules exists despite error
        const nodeModulesPath = path.join(expoTargetsPath, 'node_modules');
        const hasNodeModules = await fs
          .access(nodeModulesPath)
          .then(() => true)
          .catch(() => false);

        if (!hasNodeModules) {
          throw new Error(
            `Failed to install expo-targets dependencies: ${error.message || error}`
          );
        }
        // If node_modules exists, assume install succeeded despite error
        console.log(
          '   ⚠ npm install encountered an error but node_modules exists, continuing...'
        );
      }

      // Build the package
      console.log('   🔨 Building expo-targets package...');
      const buildResult = await execa('bun', ['run', 'build'], {
        cwd: expoTargetsPath,
        reject: false,
        timeout: 60000, // 1 minute timeout for build
      });

      // Check if process was killed or timed out
      if (buildResult.exitCode === undefined || buildResult.exitCode === null) {
        // Check if build artifacts exist despite timeout
        const pluginBuildPath = path.join(
          expoTargetsPath,
          'plugin',
          'build',
          'index.js'
        );
        const mainBuildPath = path.join(
          expoTargetsPath,
          'build',
          'src',
          'index.js'
        );
        const buildArtifactsExist = await Promise.all([
          fs
            .access(pluginBuildPath)
            .then(() => true)
            .catch(() => false),
          fs
            .access(mainBuildPath)
            .then(() => true)
            .catch(() => false),
        ]).then((results) => results.every(Boolean));

        if (!buildArtifactsExist) {
          throw new Error(
            'Build was killed or timed out and build artifacts were not created.'
          );
        }
        // If build artifacts exist, assume build succeeded despite timeout
        console.log('   ⚠ Build timed out but artifacts exist, continuing...');
      } else if (buildResult.exitCode !== 0) {
        console.error('Build failed - exit code:', buildResult.exitCode);
        console.error('Build stdout:', buildResult.stdout);
        console.error('Build stderr:', buildResult.stderr);
        throw new Error(
          `Failed to build expo-targets package. Exit code: ${buildResult.exitCode}. ${buildResult.stderr || buildResult.stdout || 'No output'}`
        );
      }
      console.log('   ✓ expo-targets built successfully');
    } else {
      console.log('   ✓ expo-targets already built, skipping build');
    }

    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies['expo-targets'] = `file:${expoTargetsPath}`;
    console.log('   Configured expo-targets dependency');

    // Ensure expo has a specific version if it's "*"
    if (packageJson.dependencies.expo === '*') {
      packageJson.dependencies.expo = '^52.0.0';
    }
    if (packageJson.dependencies.react === '*') {
      packageJson.dependencies.react = '18.3.1';
    }
    if (packageJson.dependencies['react-native'] === '*') {
      packageJson.dependencies['react-native'] = '0.76.0';
    }

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('   ✓ package.json updated');

    // Remove node_modules if it exists to force fresh install
    console.log('   Cleaning node_modules for fresh install...');
    const nodeModulesPath = path.join(tempDir, 'node_modules');
    try {
      await fs.rm(nodeModulesPath, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }

    // Install dependencies for prebuild to work
    console.log(
      '   📦 Installing project dependencies (this may take a few minutes)...'
    );

    // Log package.json for debugging
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    console.log(
      '   📄 package.json contents:',
      packageJsonContent.substring(0, 200)
    );

    const installResult = await execa('npm', ['install'], {
      cwd: tempDir,
      reject: false,
      timeout: 300000, // 5 minute timeout
    });

    // Check if process was killed or timed out
    if (
      installResult.exitCode === undefined ||
      installResult.exitCode === null
    ) {
      // Check if node_modules exists despite timeout
      const nodeModulesPath = path.join(tempDir, 'node_modules');
      const hasNodeModules = await fs
        .access(nodeModulesPath)
        .then(() => true)
        .catch(() => false);

      if (!hasNodeModules) {
        throw new Error(
          'npm install was killed or timed out and node_modules was not created.'
        );
      }
      console.log(
        'npm install timed out but node_modules exists, continuing...'
      );
    } else if (installResult.exitCode !== 0) {
      console.error('npm install failed - exit code:', installResult.exitCode);
      console.error(
        'npm install stdout length:',
        installResult.stdout?.length || 0
      );
      console.error(
        'npm install stderr length:',
        installResult.stderr?.length || 0
      );
      console.error('npm install stdout:', installResult.stdout);
      console.error('npm install stderr:', installResult.stderr);

      // Try to read npm-debug.log if it exists
      const debugLogPath = path.join(tempDir, 'npm-debug.log');
      try {
        const debugLog = await fs.readFile(debugLogPath, 'utf-8');
        console.error('npm-debug.log:', debugLog);
      } catch {
        console.error('No npm-debug.log found');
      }

      throw new Error(
        `npm install failed: ${installResult.stderr || installResult.stdout || 'No error output'}`
      );
    } else {
      console.log('   ✓ Dependencies installed successfully');
    }

    // Verify expo is installed
    console.log('   Verifying expo installation...');
    const expoPath = path.join(tempDir, 'node_modules', 'expo');
    try {
      await fs.access(expoPath);
      console.log('   ✓ Expo installed');
    } catch {
      throw new Error('Failed to install expo. npm install may have failed.');
    }

    // Verify expo-targets is installed and accessible
    console.log('   Verifying expo-targets installation...');
    const expoTargetsNodeModules = path.join(
      tempDir,
      'node_modules',
      'expo-targets'
    );
    const expoTargetsPlugin = path.join(
      expoTargetsNodeModules,
      'app.plugin.js'
    );
    try {
      await fs.access(expoTargetsPlugin);
      console.log('   ✓ expo-targets installed and accessible');
    } catch {
      throw new Error(
        'expo-targets plugin not found after install. Check file: reference.'
      );
    }

    console.log('   ✅ Managed workflow created successfully\n');
    return tempDir;
  }

  async createBareWorkflow(fixturePath: string): Promise<string> {
    console.log('   📁 Setting up bare workflow...');
    const tempDir = path.join('/tmp', `expo-targets-test-bare-${Date.now()}`);
    console.log(`   Creating temp directory: ${tempDir}`);
    await fs.mkdir(tempDir, { recursive: true });

    console.log('   Copying fixture files...');
    await this.copyDirectory(fixturePath, tempDir);
    console.log('   ✓ Fixture files copied');

    console.log('   Creating ios/ directory...');
    const iosPath = path.join(tempDir, 'ios');
    await fs.mkdir(iosPath, { recursive: true });

    console.log('   Creating minimal Xcode project...');
    await this.createBareXcodeProject(iosPath);
    console.log('   ✓ Xcode project created');

    // Add expo dependency for prebuild to work
    console.log('   Configuring package.json...');
    const packageJsonPath = path.join(tempDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies.expo = '^52.0.0';
    console.log('   Added expo dependency');

    // Add expo-targets dependency if app.json references it
    const appJsonPath = path.join(tempDir, 'app.json');
    try {
      const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf-8'));
      if (appJson.expo?.plugins?.includes('expo-targets')) {
        // Link to local expo-targets package
        const repoRoot = path.resolve(__dirname, '../../..');
        const expoTargetsPath = path.join(repoRoot, 'packages', 'expo-targets');

        // Ensure expo-targets is built before linking
        const pluginBuildPath = path.join(
          expoTargetsPath,
          'plugin',
          'build',
          'index.js'
        );
        const needsBuild = !(await fs
          .access(pluginBuildPath)
          .then(() => true)
          .catch(() => false));

        if (needsBuild) {
          console.log('   🔧 Building expo-targets for bare workflow...');
          const buildResult = await execa('bun', ['run', 'build'], {
            cwd: expoTargetsPath,
            reject: false,
            timeout: 60000,
          });

          // Check if process was killed or timed out
          if (
            buildResult.exitCode === undefined ||
            buildResult.exitCode === null
          ) {
            // Check if build artifacts exist despite timeout
            const buildArtifactsExist = await Promise.all([
              fs
                .access(pluginBuildPath)
                .then(() => true)
                .catch(() => false),
              fs
                .access(path.join(expoTargetsPath, 'build', 'src', 'index.js'))
                .then(() => true)
                .catch(() => false),
            ]).then((results) => results.every(Boolean));

            if (!buildArtifactsExist) {
              throw new Error(
                'Build was killed or timed out and build artifacts were not created.'
              );
            }
            // If build artifacts exist, assume build succeeded despite timeout
            console.log(
              '   ⚠ Build timed out but artifacts exist, continuing...'
            );
          } else if (buildResult.exitCode !== 0) {
            console.error('Build failed - exit code:', buildResult.exitCode);
            console.error('Build stdout:', buildResult.stdout);
            console.error('Build stderr:', buildResult.stderr);
            throw new Error(
              `Failed to build expo-targets package: ${buildResult.stderr || buildResult.stdout || 'No output'}`
            );
          }
          console.log('   ✓ expo-targets built successfully');
        } else {
          console.log('   ✓ expo-targets already built, skipping build');
        }

        packageJson.dependencies['expo-targets'] = `file:${expoTargetsPath}`;
        console.log('   Configured expo-targets dependency');
      }
    } catch (error: any) {
      // If it's not a missing app.json error, rethrow
      const appJsonExists = await fs
        .access(appJsonPath)
        .then(() => true)
        .catch(() => false);
      if (appJsonExists) {
        throw error;
      }
      // app.json doesn't exist, ignore
    }

    if (packageJson.dependencies.react === '*') {
      packageJson.dependencies.react = '18.3.1';
    }
    if (packageJson.dependencies['react-native'] === '*') {
      packageJson.dependencies['react-native'] = '0.76.0';
    }

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('   ✓ package.json updated');

    // Install dependencies
    console.log(
      '   📦 Installing project dependencies (this may take a few minutes)...'
    );
    const installResult = await execa('npm', ['install'], {
      cwd: tempDir,
      reject: false,
      timeout: 300000, // 5 minute timeout
    });

    // Check if process was killed or timed out
    if (
      installResult.exitCode === undefined ||
      installResult.exitCode === null
    ) {
      // Check if node_modules exists despite timeout
      const nodeModulesPath = path.join(tempDir, 'node_modules');
      const hasNodeModules = await fs
        .access(nodeModulesPath)
        .then(() => true)
        .catch(() => false);

      if (!hasNodeModules) {
        throw new Error(
          'npm install was killed or timed out and node_modules was not created.'
        );
      }
      console.log(
        'npm install timed out but node_modules exists, continuing...'
      );
    } else if (installResult.exitCode !== 0) {
      console.error('npm install failed - exit code:', installResult.exitCode);
      console.error('npm install stdout:', installResult.stdout);
      console.error('npm install stderr:', installResult.stderr);
      throw new Error(
        `npm install failed: ${installResult.stderr || installResult.stdout}`
      );
    } else {
      console.log('   ✓ Dependencies installed successfully');
    }

    // Verify expo is installed
    console.log('   Verifying expo installation...');
    const expoPath = path.join(tempDir, 'node_modules', 'expo');
    try {
      await fs.access(expoPath);
      console.log('   ✓ Expo installed');
    } catch {
      throw new Error(
        'Failed to install expo. npm install may have failed. Check logs above.'
      );
    }

    console.log('   ✅ Bare workflow created successfully\n');
    return tempDir;
  }

  async runExpoPrebuild(
    projectPath: string,
    platform: 'ios' | 'android' | 'all' = 'ios'
  ): Promise<boolean> {
    try {
      const args = ['expo', 'prebuild', '--clean'];
      if (platform !== 'all') {
        args.push('--platform', platform);
      }

      console.log(`   Running: npx ${args.join(' ')}`);
      console.log(`   Working directory: ${projectPath}`);
      console.log('   This may take a while...');

      const result = await execa('npx', args, {
        cwd: projectPath,
        reject: false,
        timeout: 120000, // 2 minute timeout
      });

      if (result.exitCode !== 0) {
        console.error('   ✗ Prebuild failed with exit code:', result.exitCode);
        console.error('   stdout length:', result.stdout?.length || 0);
        console.error('   stderr length:', result.stderr?.length || 0);
        console.error('   stdout:', result.stdout || '(empty)');
        console.error('   stderr:', result.stderr || '(empty)');

        // Check if app.json exists and has valid config
        try {
          const appJsonPath = path.join(projectPath, 'app.json');
          const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf-8'));
          console.error(
            '   app.json expo.name:',
            appJson.expo?.name || 'not found'
          );
          console.error(
            '   app.json expo.slug:',
            appJson.expo?.slug || 'not found'
          );
        } catch (e) {
          console.error('   Could not read app.json:', e);
        }
      } else {
        console.log('   ✓ Prebuild completed successfully');
      }

      return result.exitCode === 0;
    } catch (error: any) {
      console.error('   ✗ Prebuild error:', error);
      if (error.timedOut) {
        console.error('Prebuild timed out after 2 minutes');
      }
      return false;
    }
  }

  async validateManagedWorkflow(
    projectPath: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // For managed workflows, ios/ may not exist before prebuild
    // Only validate structure if ios/ exists
    const iosPath = path.join(projectPath, 'ios');
    const iosExists = await fs
      .access(iosPath)
      .then(() => true)
      .catch(() => false);

    if (iosExists) {
      const structureResult =
        await this.validator.validateProjectStructure(projectPath);
      errors.push(...structureResult.errors);
      warnings.push(...structureResult.warnings);
    }

    const appJsonPath = path.join(projectPath, 'app.json');
    try {
      const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf-8'));
      if (!appJson.expo?.plugins?.includes('expo-targets')) {
        errors.push('expo-targets plugin not found in app.json');
      }
    } catch (error) {
      errors.push(`Failed to read app.json: ${error}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async validateBareWorkflow(projectPath: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const iosPath = path.join(projectPath, 'ios');
    try {
      await fs.access(iosPath);
    } catch {
      errors.push('ios/ directory not found');
      return { valid: false, errors, warnings };
    }

    const { glob } = await import('glob');
    const xcodeProjects = await glob('*.xcodeproj', { cwd: iosPath });
    if (xcodeProjects.length === 0) {
      errors.push('No Xcode project found in bare workflow');
    }

    const podfilePath = path.join(iosPath, 'Podfile');
    try {
      await fs.access(podfilePath);
    } catch {
      warnings.push('Podfile not found - CocoaPods may not be configured');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async createBareXcodeProject(iosPath: string): Promise<void> {
    const projectName = path.basename(path.dirname(iosPath));
    const projectPath = path.join(iosPath, `${projectName}.xcodeproj`);

    await fs.mkdir(projectPath, { recursive: true });

    const projectPbxproj = path.join(projectPath, 'project.pbxproj');
    const minimalPbxproj = `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 54;
	objects = {
	};
	rootObject = 000000000000000000000000 /* Project object */;
}
`;

    await fs.writeFile(projectPbxproj, minimalPbxproj);
  }

  async cleanup(tempDir: string): Promise<void> {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
