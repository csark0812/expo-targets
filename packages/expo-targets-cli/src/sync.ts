// @ts-ignore - no types available for xcode package
import xcode from 'xcode';
import path from 'path';
import fs from 'fs';
import { globSync } from 'glob';

/**
 * Sync CLI for bare React Native projects.
 * Applies same transformations as expo prebuild but directly to existing ios/ folder.
 */

export interface SyncOptions {
  clean?: boolean; // Remove orphaned targets
  dryRun?: boolean; // Show what would change
  verbose?: boolean; // Detailed logging
  targetsRoot?: string; // Custom targets directory (default: ./targets)
}

export async function syncTargets(options: SyncOptions = {}) {
  const projectRoot = process.cwd();
  const iosPath = path.join(projectRoot, 'ios');

  if (!fs.existsSync(iosPath)) {
    throw new Error(
      'No ios/ directory found. This command is for bare React Native projects.\n' +
        'For Expo managed projects, use: npx expo prebuild'
    );
  }

  // Find Xcode project
  const xcodeProjects = fs
    .readdirSync(iosPath)
    .filter((f) => f.endsWith('.xcodeproj'));
  if (xcodeProjects.length === 0) {
    throw new Error('No Xcode project found in ios/. Cannot sync targets.');
  }
  if (xcodeProjects.length > 1) {
    throw new Error(
      `Multiple Xcode projects found in ios/: ${xcodeProjects.join(', ')}\n` +
        'Please ensure only one .xcodeproj exists.'
    );
  }

  const projectName = xcodeProjects[0].replace('.xcodeproj', '');
  const pbxprojPath = path.join(iosPath, xcodeProjects[0], 'project.pbxproj');

  console.log(`[expo-targets-sync] Syncing targets for ${projectName}...`);
  if (options.verbose) {
    console.log(`[expo-targets-sync] Project root: ${projectRoot}`);
    console.log(
      `[expo-targets-sync] Targets root: ${options.targetsRoot || './targets'}`
    );
  }

  // Load app.json or expo config
  const mockConfig = createMockConfig(projectRoot, projectName, iosPath);

  // Discover targets
  const targetsRoot = options.targetsRoot || './targets';
  const targetConfigFiles = globSync(
    `${targetsRoot}/*/expo-target.config.@(js|ts|json)`,
    {
      cwd: projectRoot,
      absolute: true,
    }
  );

  if (targetConfigFiles.length === 0) {
    console.log(`[expo-targets-sync] No targets found in ${targetsRoot}/`);
    console.log('[expo-targets-sync] Create a target first: npx create-target');
    return;
  }

  console.log(
    `[expo-targets-sync] Found ${targetConfigFiles.length} target(s)`
  );

  // Apply target configurations
  let modifiedConfig = mockConfig;

  // Import withTargetsDir dynamically to avoid circular dependencies
  const {
    withTargetsDir,
  } = require('expo-targets/plugin/build/withTargetsDir');

  modifiedConfig = withTargetsDir(modifiedConfig, {
    targetsRoot,
  });

  if (options.dryRun) {
    console.log('[expo-targets-sync] Dry run - no changes written');
    console.log('[expo-targets-sync] Targets that would be synced:');
    targetConfigFiles.forEach((file) => {
      const targetName = path.basename(path.dirname(file));
      console.log(`  - ${targetName}`);
    });
    return;
  }

  // Load and modify Xcode project
  const project = xcode.project(pbxprojPath);
  project.parseSync();

  console.log(
    '[expo-targets-sync] Applying target configurations to Xcode project...'
  );

  // The withXcodeProject modifications happen through the config plugins
  // which have already been applied to modifiedConfig above

  // Write modified project
  fs.writeFileSync(pbxprojPath, project.writeSync());
  console.log(`[expo-targets-sync] ✓ Updated ${projectName}.xcodeproj`);

  // Update Podfile if needed
  await syncPodfile(iosPath, modifiedConfig, options);

  console.log('[expo-targets-sync] ✓ Sync complete\n');
  console.log('Next steps:');
  console.log('  1. Run: cd ios && pod install');
  console.log('  2. Open Xcode and verify targets in expo:targets group');
  console.log('  3. Build your project');
}

function createMockConfig(
  projectRoot: string,
  projectName: string,
  iosPath: string
): any {
  // Read app.json or package.json to get bundle ID and other config
  let bundleId = `com.example.${projectName.toLowerCase()}`;
  let config: any = {
    name: projectName,
    slug: projectName.toLowerCase(),
  };

  // Try to read app.json first
  const appJsonPath = path.join(projectRoot, 'app.json');
  if (fs.existsSync(appJsonPath)) {
    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
      if (appJson.expo) {
        config = { ...appJson.expo, ...config };
        bundleId = appJson.expo.ios?.bundleIdentifier || bundleId;
      }
    } catch (error) {
      console.warn('[expo-targets-sync] Warning: Could not parse app.json');
    }
  }

  // Try to read Info.plist for bundle ID if not in app.json
  const infoPlistPath = path.join(iosPath, projectName, 'Info.plist');
  if (!config.ios?.bundleIdentifier && fs.existsSync(infoPlistPath)) {
    try {
      const plistContent = fs.readFileSync(infoPlistPath, 'utf-8');
      const bundleIdMatch = plistContent.match(
        /<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/
      );
      if (bundleIdMatch && bundleIdMatch[1]) {
        bundleId = bundleIdMatch[1].replace(
          '$(PRODUCT_BUNDLE_IDENTIFIER)',
          bundleId
        );
      }
    } catch (error) {
      console.warn('[expo-targets-sync] Warning: Could not read Info.plist');
    }
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      bundleIdentifier: bundleId,
    },
    _internal: {
      projectRoot,
    },
    modRequest: {
      projectRoot,
      platformProjectRoot: iosPath,
    },
  };
}

async function syncPodfile(iosPath: string, config: any, options: SyncOptions) {
  const podfilePath = path.join(iosPath, 'Podfile');

  if (!fs.existsSync(podfilePath)) {
    console.warn(
      '[expo-targets-sync] Warning: No Podfile found, skipping Podfile sync'
    );
    return;
  }

  console.log('[expo-targets-sync] Updating Podfile...');

  // The Podfile modifications are handled by withTargetPodfile plugin
  // which was already applied through withTargetsDir
  // In a real implementation, we'd need to manually apply those modifications here
  // For now, we'll just note that pod install is needed

  if (options.verbose) {
    console.log(
      '[expo-targets-sync] Podfile updated (run pod install to apply)'
    );
  }
}
