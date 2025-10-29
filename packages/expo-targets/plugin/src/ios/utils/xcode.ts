import { IOSConfig } from '@expo/config-plugins';
import type { XcodeProject } from '@expo/config-plugins';
import path from 'path';

import * as File from './file';
import * as Paths from './paths';

/**
 * High-level utilities for Xcode project manipulation in expo-targets.
 * Wraps IOSConfig.XcodeUtils for consistency and extends with target-specific operations.
 */

// Re-export commonly used utilities from IOSConfig.XcodeUtils
export const {
  ensureGroupRecursively,
  addResourceFileToGroup,
  addBuildSourceFileToGroup,
  getProjectName,
  getApplicationNativeTarget,
} = IOSConfig.XcodeUtils;

/**
 * Target creation result from xcode library
 */
interface XcodeTarget {
  uuid: string;
  pbxNativeTarget?: any;
  target?: any;
}

/**
 * Add target dependency from main app to extension/clip target.
 * Ensures PBXTargetDependency and PBXContainerItemProxy sections exist.
 */
export function addTargetDependency({
  project,
  mainTargetUuid,
  dependentTargetUuid,
}: {
  project: XcodeProject;
  mainTargetUuid: string;
  dependentTargetUuid: string;
}): void {
  const xcodeProject = project as any;

  // Ensure required sections exist
  if (!xcodeProject.hash.project.objects['PBXTargetDependency']) {
    xcodeProject.hash.project.objects['PBXTargetDependency'] = {};
  }
  if (!xcodeProject.hash.project.objects['PBXContainerItemProxy']) {
    xcodeProject.hash.project.objects['PBXContainerItemProxy'] = {};
  }

  xcodeProject.addTargetDependency(mainTargetUuid, [dependentTargetUuid]);
}

/**
 * Configure embed settings for app extension.
 * Adds RemoveHeadersOnCopy attribute and renames Copy Files phase.
 */
export function configureAppExtensionEmbed({
  project,
  targetProductName,
}: {
  project: XcodeProject;
  targetProductName: string;
}): void {
  const xcodeProject = project as any;
  const buildFileSection = xcodeProject.hash.project.objects.PBXBuildFile;
  const fileRefSection = xcodeProject.hash.project.objects.PBXFileReference;
  const targetFileName = `${targetProductName}.appex`;

  const ensureAttributes = (buildFile: any) => {
    const desired = ['RemoveHeadersOnCopy', 'CodeSignOnCopy'];
    if (!buildFile.settings || !Array.isArray(buildFile.settings.ATTRIBUTES)) {
      buildFile.settings = { ATTRIBUTES: desired };
      return;
    }
    const attrs: string[] = buildFile.settings.ATTRIBUTES;
    desired.forEach((attr) => {
      if (!attrs.includes(attr)) attrs.push(attr);
    });
  };

  // Find and configure the PBXBuildFile for the extension (global scan)
  let foundBuildFile = false;
  for (const buildFileKey in buildFileSection) {
    if (buildFileKey.endsWith('_comment')) continue;

    const buildFile = buildFileSection[buildFileKey];
    if (buildFile?.fileRef) {
      const fileRef = fileRefSection[buildFile.fileRef];
      const refPath = fileRef?.path?.replace(/"/g, '');
      const refName = fileRef?.name?.replace(/"/g, '');

      if (refPath === targetFileName || refName === targetFileName) {
        ensureAttributes(buildFile);
        foundBuildFile = true;
        break;
      }
    }
  }

  if (!foundBuildFile) {
    console.warn(
      `[expo-targets] Could not find PBXBuildFile for ${targetProductName}.appex`
    );
  }

  // Rename Copy Files phase to "Embed App Extensions" and ensure attributes inside the phase
  const copyFilesPhases =
    xcodeProject.hash.project.objects.PBXCopyFilesBuildPhase;

  for (const phaseKey in copyFilesPhases) {
    if (phaseKey.endsWith('_comment')) continue;

    const phase = copyFilesPhases[phaseKey];
    if (phase?.dstSubfolderSpec === 13 && phase.files) {
      let hasOurExtension = false;
      // Ensure each matching build file has desired attributes
      phase.files.forEach((file: any) => {
        const buildFileKey = file.value;
        const buildFile = buildFileSection?.[buildFileKey];
        if (!buildFile) return;
        const fileRef = fileRefSection?.[buildFile.fileRef];
        const refPath = fileRef?.path?.replace(/"/g, '');
        const refName = fileRef?.name?.replace(/"/g, '');
        if (refPath === targetFileName || refName === targetFileName) {
          hasOurExtension = true;
          ensureAttributes(buildFile);
        }
      });

      if (hasOurExtension) {
        const commentKey = `${phaseKey}_comment`;
        copyFilesPhases[commentKey] = 'Embed App Extensions';
        phase.name = '"Embed App Extensions"';
        break;
      }
    }
  }
}

/**
 * Configure embed settings for App Clip.
 * Creates "Embed App Clips" phase with proper settings.
 */
export function configureAppClipEmbed({
  project,
  mainTargetUuid,
  target,
  targetProductName,
}: {
  project: XcodeProject;
  mainTargetUuid: string;
  target: XcodeTarget;
  targetProductName: string;
}): void {
  const xcodeProject = project as any;

  // Get the App Clip product reference
  const appClipFileRef =
    target.pbxNativeTarget?.productReference || target.target?.productReference;

  if (!appClipFileRef) {
    console.warn(
      `[expo-targets] Could not find product reference for ${targetProductName}.app`
    );
    return;
  }

  // Create Copy Files build phase for App Clips
  const embedPhaseResult = xcodeProject.addBuildPhase(
    [],
    'PBXCopyFilesBuildPhase',
    'Embed App Clips',
    mainTargetUuid
  );

  const embedPhaseUuid = embedPhaseResult?.uuid || embedPhaseResult;

  if (!embedPhaseUuid) {
    console.warn(`[expo-targets] Failed to create Embed App Clips phase`);
    return;
  }

  const copyFilesPhases =
    xcodeProject.hash.project.objects.PBXCopyFilesBuildPhase;
  const phase = copyFilesPhases[embedPhaseUuid];

  if (!phase) {
    console.warn(
      `[expo-targets] Could not find phase object for UUID: ${embedPhaseUuid}`
    );
    return;
  }

  // Configure phase for App Clips
  phase.dstPath = '"$(CONTENTS_FOLDER_PATH)/AppClips"';
  phase.dstSubfolderSpec = 16;
  phase.name = '"Embed App Clips"';

  // Create a PBXBuildFile for the App Clip
  const buildFileUuid = xcodeProject.generateUuid();
  const buildFileSection = xcodeProject.hash.project.objects.PBXBuildFile;

  buildFileSection[buildFileUuid] = {
    isa: 'PBXBuildFile',
    fileRef: appClipFileRef,
    settings: {
      ATTRIBUTES: ['RemoveHeadersOnCopy'],
    },
  };
  buildFileSection[`${buildFileUuid}_comment`] =
    `${targetProductName}.app in Embed App Clips`;

  // Add the build file to the phase
  if (!phase.files) {
    phase.files = [];
  }
  phase.files.push({
    value: buildFileUuid,
    comment: `${targetProductName}.app in Embed App Clips`,
  });
}

/**
 * Set product type for a native target.
 * Useful for App Clips which need special product type after creation.
 */
export function setProductType({
  target,
  productType,
}: {
  target: XcodeTarget;
  productType: string;
}): void {
  const nativeTarget = target.pbxNativeTarget || target.target;
  if (nativeTarget) {
    nativeTarget.productType = productType;
  }
}

/**
 * Apply build settings to all configurations of a target.
 */
export function applyBuildSettings({
  project,
  target,
  buildSettings,
  verbose = false,
}: {
  project: XcodeProject;
  target: XcodeTarget;
  buildSettings: Record<string, string | string[]>;
  verbose?: boolean;
}): void {
  const xcodeProject = project as any;

  const targetBuildConfigId =
    target.pbxNativeTarget?.buildConfigurationList ||
    target.target?.buildConfigurationList;

  const buildConfigList =
    xcodeProject.pbxXCConfigurationList()[targetBuildConfigId];

  if (!buildConfigList?.buildConfigurations) {
    console.warn(`[expo-targets] No build configurations found for target`);
    return;
  }

  buildConfigList.buildConfigurations.forEach((config: any) => {
    const configSection =
      xcodeProject.pbxXCBuildConfigurationSection()[config.value];
    const configName = configSection?.name;

    if (verbose) {
      console.log(`[expo-targets]   Configuring ${configName} build settings`);
    }

    if (configSection?.buildSettings) {
      Object.entries(buildSettings).forEach(([key, value]) => {
        configSection.buildSettings[key] = value;
        if (verbose && key === 'SWIFT_VERSION') {
          console.log(
            `[expo-targets]     Set ${key}=${value} to ${configName}`
          );
        }
      });
    }
  });
}

/**
 * Remove a build setting from all configurations of a target.
 */
export function removeBuildSetting({
  project,
  target,
  settingKey,
  verbose = false,
}: {
  project: XcodeProject;
  target: XcodeTarget;
  settingKey: string;
  verbose?: boolean;
}): void {
  const xcodeProject = project as any;

  const targetBuildConfigId =
    target.pbxNativeTarget?.buildConfigurationList ||
    target.target?.buildConfigurationList;

  const buildConfigList =
    xcodeProject.pbxXCConfigurationList()[targetBuildConfigId];

  if (!buildConfigList?.buildConfigurations) return;

  buildConfigList.buildConfigurations.forEach((config: any) => {
    const configSection =
      xcodeProject.pbxXCBuildConfigurationSection()[config.value];

    if (configSection?.buildSettings?.[settingKey]) {
      delete configSection.buildSettings[settingKey];
      if (verbose) {
        console.log(
          `[expo-targets]     Removed ${settingKey} from ${configSection.name}`
        );
      }
    }
  });
}

/**
 * Get build settings from the main app target.
 */
export function getMainAppBuildSettings({
  project,
  mainTarget,
}: {
  project: XcodeProject;
  mainTarget: { uuid: string; target: any };
}): Record<string, any> {
  const xcodeProject = project as any;

  const mainTargetBuildConfigId = mainTarget.target?.buildConfigurationList;
  const mainBuildConfigList =
    xcodeProject.pbxXCConfigurationList()[mainTargetBuildConfigId];
  const mainBuildConfig = mainBuildConfigList?.buildConfigurations?.[0]?.value;

  return mainBuildConfig
    ? xcodeProject.pbxXCBuildConfigurationSection()[mainBuildConfig]
        ?.buildSettings || {}
    : {};
}

/**
 * Find a target UUID by its product name.
 */
export function findTargetByProductName({
  project,
  productName,
}: {
  project: XcodeProject;
  productName: string;
}): string | undefined {
  const xcodeProject = project as any;
  const pbxNativeTargetSection =
    xcodeProject.hash.project.objects.PBXNativeTarget || {};

  for (const key in pbxNativeTargetSection) {
    if (key.endsWith('_comment')) continue;
    const target = pbxNativeTargetSection[key];
    if (target?.name === productName) {
      return key;
    }
  }

  return undefined;
}

/**
 * Add Assets.xcassets to a target's Resources build phase if it exists.
 */
export function addTargetAssets({
  platformProjectRoot,
  targetName,
  targetUuid,
  xcodeProject,
  isStickers,
}: {
  platformProjectRoot: string;
  targetName: string;
  targetUuid: string;
  xcodeProject: any;
  isStickers?: boolean;
}): void {
  const targetProductName = Paths.sanitizeTargetName(targetName);
  const assetsPath = Paths.getAssetsXcassetsPath({
    platformProjectRoot,
    targetName,
    isStickers,
  });

  if (File.isDirectory(assetsPath)) {
    const assetsFolderName = isStickers
      ? 'Stickers.xcassets'
      : 'Assets.xcassets';
    console.log(
      `[expo-targets] Found ${assetsFolderName}, adding to ${targetProductName}...`
    );

    // Add Assets.xcassets as a resource file
    const relativePath = path.relative(platformProjectRoot, assetsPath);

    addResourceFileToGroup({
      filepath: relativePath,
      groupName: targetProductName,
      project: xcodeProject,
      isBuildFile: true,
      verbose: true,
      targetUuid,
    });

    console.log(
      `[expo-targets] ✓ Added ${assetsFolderName} to ${targetProductName} Resources build phase`
    );
  } else {
    const assetsFolderName = isStickers
      ? 'Stickers.xcassets'
      : 'Assets.xcassets';
    console.log(
      `[expo-targets] ${assetsFolderName} directory not found at: ${assetsPath}`
    );
  }
}
