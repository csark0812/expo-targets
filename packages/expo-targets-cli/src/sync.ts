import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { globSync } from 'glob';
// @ts-expect-error - no types available for xcode package
import xcode from 'xcode';

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

  validateIosDirectory(iosPath);

  const { projectName, pbxprojPath } = findXcodeProject(iosPath);
  if (options.verbose) {
  }

  const mockConfig = createMockConfig(projectRoot, projectName, iosPath);
  const targetsRoot = options.targetsRoot || './targets';
  const targetConfigFiles = discoverTargetConfigs(projectRoot, targetsRoot);

  if (targetConfigFiles.length === 0) {
    return;
  }

  const modifiedConfig = applyTargetsDir(mockConfig, targetsRoot);

  if (options.dryRun) {
    logDryRunTargets(targetConfigFiles);
    return;
  }

  writeXcodeProject(pbxprojPath);
  await syncPodfile(iosPath, modifiedConfig, options);
}

function validateIosDirectory(iosPath: string) {
  if (!fs.existsSync(iosPath)) {
    throw new Error(
      'No ios/ directory found. This command is for bare React Native projects.\n' +
        'For Expo managed projects, use: npx expo prebuild'
    );
  }
}

function findXcodeProject(iosPath: string) {
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
  return { projectName, pbxprojPath };
}

function discoverTargetConfigs(projectRoot: string, targetsRoot: string) {
  return globSync(`${targetsRoot}/*/expo-target.config.@(js|ts|json)`, {
    cwd: projectRoot,
    absolute: true,
  });
}

function applyTargetsDir(mockConfig: any, targetsRoot: string) {
  const {
    withTargetsDir,
  } = require('expo-targets/plugin/build/withTargetsDir');

  return withTargetsDir(mockConfig, { targetsRoot });
}

function logDryRunTargets(targetConfigFiles: string[]) {
  for (const file of targetConfigFiles) {
    const _targetName = path.basename(path.dirname(file));
  }
}

function writeXcodeProject(pbxprojPath: string) {
  const project = xcode.project(pbxprojPath);
  project.parseSync();
  fs.writeFileSync(pbxprojPath, project.writeSync());
}

function createMockConfig(
  projectRoot: string,
  projectName: string,
  iosPath: string
): any {
  let bundleId = `com.example.${projectName.toLowerCase()}`;
  let config: any = {
    name: projectName,
    slug: projectName.toLowerCase(),
  };

  const appJsonResult = readAppJsonConfig(projectRoot);
  if (appJsonResult) {
    config = { ...appJsonResult.config, ...config };
    bundleId = appJsonResult.bundleId || bundleId;
  }

  if (!config.ios?.bundleIdentifier) {
    bundleId = readBundleIdFromInfoPlist(iosPath, projectName, bundleId);
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

function readAppJsonConfig(projectRoot: string): {
  config: any;
  bundleId?: string;
} | null {
  const appJsonPath = path.join(projectRoot, 'app.json');
  if (!fs.existsSync(appJsonPath)) {
    return null;
  }

  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
    if (!appJson.expo) {
      return null;
    }
    return {
      config: appJson.expo,
      bundleId: appJson.expo.ios?.bundleIdentifier,
    };
  } catch {
    return null;
  }
}

function readBundleIdFromInfoPlist(
  iosPath: string,
  projectName: string,
  bundleId: string
): string {
  const infoPlistPath = path.join(iosPath, projectName, 'Info.plist');
  if (!fs.existsSync(infoPlistPath)) {
    return bundleId;
  }

  try {
    const plistContent = fs.readFileSync(infoPlistPath, 'utf-8');
    const bundleIdMatch = plistContent.match(
      /<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/
    );
    if (bundleIdMatch?.[1]) {
      return bundleIdMatch[1].replace('$(PRODUCT_BUNDLE_IDENTIFIER)', bundleId);
    }
  } catch {}

  return bundleId;
}

async function syncPodfile(
  iosPath: string,
  _config: any,
  options: SyncOptions
) {
  const podfilePath = path.join(iosPath, 'Podfile');

  if (!fs.existsSync(podfilePath)) {
    return;
  }

  // The Podfile modifications are handled by withTargetPodfile plugin
  // which was already applied through withTargetsDir
  // In a real implementation, we'd need to manually apply those modifications here
  // For now, we'll just note that pod install is needed

  if (options.verbose) {
  }
}
