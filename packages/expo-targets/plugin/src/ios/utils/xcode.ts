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
 * Check if target already has a specific build phase type
 */
export function hasBuildPhase({
  project,
  targetUuid,
  phaseType,
}: {
  project: XcodeProject;
  targetUuid: string;
  phaseType: string;
}): boolean {
  const xcodeProject = project as any;
  const target = xcodeProject.hash.project.objects.PBXNativeTarget[targetUuid];

  if (!target || !target.buildPhases) {
    return false;
  }

  const phaseSection = xcodeProject.hash.project.objects[phaseType];
  if (!phaseSection) {
    return false;
  }

  return target.buildPhases.some((phase: any) => {
    const phaseUuid = phase.value;
    return phaseSection[phaseUuid] !== undefined;
  });
}

/**
 * Remove build phases of a specific type from target
 */
export function removeBuildPhases({
  project,
  targetUuid,
  phaseType,
}: {
  project: XcodeProject;
  targetUuid: string;
  phaseType: string;
}): void {
  const xcodeProject = project as any;
  const target = xcodeProject.hash.project.objects.PBXNativeTarget[targetUuid];

  if (!target || !target.buildPhases) {
    return;
  }

  const phaseSection = xcodeProject.hash.project.objects[phaseType];
  if (!phaseSection) {
    return;
  }

  // Find matching phase UUIDs
  const phasesToRemove: string[] = [];
  target.buildPhases.forEach((phase: any) => {
    const phaseUuid = phase.value;
    if (phaseSection[phaseUuid]) {
      phasesToRemove.push(phaseUuid);
    }
  });

  // Remove phases from target's buildPhases array
  target.buildPhases = target.buildPhases.filter(
    (phase: any) => !phasesToRemove.includes(phase.value)
  );

  // Remove phase objects and comments from section
  phasesToRemove.forEach((phaseUuid) => {
    delete phaseSection[phaseUuid];
    delete phaseSection[`${phaseUuid}_comment`];
  });
}

/**
 * Check if target dependency already exists
 */
export function hasTargetDependency({
  project,
  mainTargetUuid,
  dependentTargetUuid,
}: {
  project: XcodeProject;
  mainTargetUuid: string;
  dependentTargetUuid: string;
}): boolean {
  const xcodeProject = project as any;
  const mainTarget =
    xcodeProject.hash.project.objects.PBXNativeTarget[mainTargetUuid];

  if (!mainTarget || !mainTarget.dependencies) {
    return false;
  }

  const dependencies = xcodeProject.hash.project.objects.PBXTargetDependency;
  if (!dependencies) {
    return false;
  }

  return mainTarget.dependencies.some((dep: any) => {
    const depUuid = dep.value;
    const dependency = dependencies[depUuid];
    return dependency && dependency.target === dependentTargetUuid;
  });
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
  // Check if dependency already exists
  if (hasTargetDependency({ project, mainTargetUuid, dependentTargetUuid })) {
    return;
  }

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
  logger,
}: {
  project: XcodeProject;
  target: XcodeTarget;
  buildSettings: Record<string, string | string[]>;
  verbose?: boolean;
  logger?: { log: (message: string) => void };
}): void {
  const xcodeProject = project as any;

  const targetBuildConfigId =
    target.pbxNativeTarget?.buildConfigurationList ||
    target.target?.buildConfigurationList;

  const buildConfigList =
    xcodeProject.pbxXCConfigurationList()[targetBuildConfigId];

  if (!buildConfigList?.buildConfigurations) {
    if (logger) {
      logger.log('No build configurations found for target');
    } else {
      console.warn(`[expo-targets] No build configurations found for target`);
    }
    return;
  }

  buildConfigList.buildConfigurations.forEach((config: any) => {
    const configSection =
      xcodeProject.pbxXCBuildConfigurationSection()[config.value];
    const configName = configSection?.name;

    if (verbose) {
      if (logger) {
        logger.log(`  Configuring ${configName} build settings`);
      } else {
        console.log(
          `[expo-targets]   Configuring ${configName} build settings`
        );
      }
    }

    if (configSection?.buildSettings) {
      Object.entries(buildSettings).forEach(([key, value]) => {
        configSection.buildSettings[key] = value;
        if (
          verbose &&
          (key === 'SWIFT_VERSION' || key === 'IPHONEOS_DEPLOYMENT_TARGET')
        ) {
          if (logger) {
            logger.log(`    Set ${key}=${value} to ${configName}`);
          } else {
            console.log(
              `[expo-targets]     Set ${key}=${value} to ${configName}`
            );
          }
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
  logger,
}: {
  project: XcodeProject;
  target: XcodeTarget;
  settingKey: string;
  verbose?: boolean;
  logger?: { log: (message: string) => void };
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
        if (logger) {
          logger.log(`    Removed ${settingKey} from ${configSection.name}`);
        } else {
          console.log(
            `[expo-targets]     Removed ${settingKey} from ${configSection.name}`
          );
        }
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
 * Find all target UUIDs with a given product name (detects duplicates)
 */
export function findAllTargetsByProductName({
  project,
  productName,
}: {
  project: XcodeProject;
  productName: string;
}): string[] {
  const xcodeProject = project as any;
  const pbxNativeTargetSection =
    xcodeProject.hash.project.objects.PBXNativeTarget || {};
  const matchingTargets: string[] = [];

  for (const key in pbxNativeTargetSection) {
    if (key.endsWith('_comment')) continue;
    const target = pbxNativeTargetSection[key];
    if (target?.name === productName) {
      matchingTargets.push(key);
    }
  }

  return matchingTargets;
}

/**
 * Remove duplicate targets with the same product name, keeping only the first one
 */
export function removeDuplicateTargets({
  project,
  productName,
}: {
  project: XcodeProject;
  productName: string;
}): number {
  const allTargets = findAllTargetsByProductName({ project, productName });

  if (allTargets.length <= 1) {
    return 0;
  }

  const xcodeProject = project as any;
  const [keepTarget, ...duplicates] = allTargets;

  console.log(
    `[expo-targets] Found ${allTargets.length} targets named "${productName}", removing ${duplicates.length} duplicate(s)`
  );

  duplicates.forEach((targetUuid) => {
    // Remove from PBXNativeTarget section
    const pbxNativeTargetSection =
      xcodeProject.hash.project.objects.PBXNativeTarget;
    if (pbxNativeTargetSection) {
      delete pbxNativeTargetSection[targetUuid];
      delete pbxNativeTargetSection[`${targetUuid}_comment`];
    }

    // Remove from project targets list
    const project = xcodeProject.hash.project.objects.PBXProject;
    for (const projectKey in project) {
      if (projectKey.endsWith('_comment')) continue;
      const projectObj = project[projectKey];
      if (projectObj?.targets) {
        projectObj.targets = projectObj.targets.filter(
          (t: any) => t.value !== targetUuid
        );
      }
    }

    // Remove build configuration list
    const target =
      xcodeProject.hash.project.objects.PBXNativeTarget?.[targetUuid];
    if (target?.buildConfigurationList) {
      const configListUuid = target.buildConfigurationList;
      const configListSection =
        xcodeProject.hash.project.objects.XCConfigurationList;
      if (configListSection) {
        delete configListSection[configListUuid];
        delete configListSection[`${configListUuid}_comment`];
      }
    }

    console.log(`[expo-targets]   Removed duplicate target: ${targetUuid}`);
  });

  return duplicates.length;
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
  // Get the actual group directory name (includes 'Target' suffix)
  const targetGroupPath = Paths.getTargetGroupPath({
    platformProjectRoot,
    targetName,
  });
  const targetDirName = path.basename(targetGroupPath);

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
      groupName: targetDirName,
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

/**
 * ============================================================================
 * NEW: Virtual Group Helpers for Reference-in-Place
 * ============================================================================
 * These functions create and manage the "expo:targets" virtual group in Xcode,
 * which contains references to files outside the ios/ directory.
 */

/**
 * Ensure the virtual "expo:targets" group exists in Xcode.
 * This group contains references to files outside ios/ directory.
 * Returns the UUID of the expo:targets group.
 */
export function ensureExpoTargetsGroup({
  project,
}: {
  project: XcodeProject;
}): string {
  const xcodeProject = project as any;

  // Get the root project object
  const rootObject = xcodeProject.hash.project.rootObject;
  const projectObject =
    xcodeProject.hash.project.objects.PBXProject[rootObject];

  // Get the main group UUID from the project object
  const mainGroupUuid = projectObject.mainGroup;
  const mainGroup = xcodeProject.hash.project.objects.PBXGroup[mainGroupUuid];

  // Check if expo:targets already exists
  const existingGroup = Object.entries(
    xcodeProject.hash.project.objects.PBXGroup
  ).find(([_, group]: [string, any]) => group.name === '"expo:targets"');

  if (existingGroup) {
    return existingGroup[0];
  }

  // Create new virtual group
  const groupUuid = xcodeProject.generateUuid();
  xcodeProject.hash.project.objects.PBXGroup[groupUuid] = {
    isa: 'PBXGroup',
    children: [],
    name: '"expo:targets"',
    sourceTree: '"<group>"',
  };
  xcodeProject.hash.project.objects.PBXGroup[`${groupUuid}_comment`] =
    'expo:targets';

  // Add to main group
  if (!mainGroup.children) {
    mainGroup.children = [];
  }
  mainGroup.children.push({
    value: groupUuid,
    comment: 'expo:targets',
  });

  return groupUuid;
}

/**
 * Add target subfolder to expo:targets virtual group.
 * Returns the group UUID for the target.
 */
export function addTargetToVirtualGroup({
  project,
  targetName,
  virtualGroupUuid,
}: {
  project: XcodeProject;
  targetName: string;
  virtualGroupUuid: string;
}): string {
  const xcodeProject = project as any;

  // Check if target group already exists
  const virtualGroup =
    xcodeProject.hash.project.objects.PBXGroup[virtualGroupUuid];
  if (virtualGroup && virtualGroup.children) {
    const existingTarget = virtualGroup.children.find(
      (child: any) => child.comment === targetName
    );
    if (existingTarget) {
      return existingTarget.value;
    }
  }

  const targetGroupUuid = xcodeProject.generateUuid();

  xcodeProject.hash.project.objects.PBXGroup[targetGroupUuid] = {
    isa: 'PBXGroup',
    children: [],
    name: `"${targetName}"`,
    sourceTree: '"<group>"',
  };
  xcodeProject.hash.project.objects.PBXGroup[`${targetGroupUuid}_comment`] =
    targetName;

  // Add to virtual group
  if (!virtualGroup.children) {
    virtualGroup.children = [];
  }
  virtualGroup.children.push({
    value: targetGroupUuid,
    comment: targetName,
  });

  return targetGroupUuid;
}

/**
 * Add file reference to group, pointing to external path.
 * Returns the file reference UUID.
 */
export function addExternalFileReference({
  project,
  groupUuid,
  filePath,
  fileName,
  fileType,
}: {
  project: XcodeProject;
  groupUuid: string;
  filePath: string;
  fileName: string;
  fileType?: string;
}): string {
  const xcodeProject = project as any;

  // Determine file type
  let lastKnownFileType = fileType || 'sourcecode.swift';
  if (fileName.endsWith('.xcassets')) {
    lastKnownFileType = 'folder.assetcatalog';
  } else if (fileName.endsWith('.swift')) {
    lastKnownFileType = 'sourcecode.swift';
  } else if (fileName.endsWith('.h')) {
    lastKnownFileType = 'sourcecode.c.h';
  } else if (fileName.endsWith('.m')) {
    lastKnownFileType = 'sourcecode.c.objc';
  }

  const fileRefUuid = xcodeProject.generateUuid();

  xcodeProject.hash.project.objects.PBXFileReference[fileRefUuid] = {
    isa: 'PBXFileReference',
    lastKnownFileType,
    name: `"${fileName}"`,
    path: `"${filePath}"`,
    sourceTree: '"<group>"',
  };
  xcodeProject.hash.project.objects.PBXFileReference[`${fileRefUuid}_comment`] =
    fileName;

  // Add to group
  const group = xcodeProject.hash.project.objects.PBXGroup[groupUuid];
  if (!group.children) {
    group.children = [];
  }

  // Check if file already exists in group
  const existingFile = group.children.find(
    (child: any) => child.comment === fileName
  );
  if (!existingFile) {
    group.children.push({
      value: fileRefUuid,
      comment: fileName,
    });
  }

  return fileRefUuid;
}

/**
 * Add file to specific build phase by file reference UUID.
 */
export function addFileToBuildPhase({
  project,
  targetUuid,
  fileRefUuid,
  phaseType,
}: {
  project: XcodeProject;
  targetUuid: string;
  fileRefUuid: string;
  phaseType:
    | 'PBXSourcesBuildPhase'
    | 'PBXResourcesBuildPhase'
    | 'PBXFrameworksBuildPhase';
}): void {
  const xcodeProject = project as any;
  const target = xcodeProject.hash.project.objects.PBXNativeTarget[targetUuid];

  if (!target || !target.buildPhases) {
    throw new Error(`Target ${targetUuid} not found or has no build phases`);
  }

  // Find the build phase
  const phaseUuid = target.buildPhases.find((phase: any) => {
    const phaseObj = xcodeProject.hash.project.objects[phaseType][phase.value];
    return phaseObj !== undefined;
  })?.value;

  if (!phaseUuid) {
    throw new Error(
      `Build phase ${phaseType} not found for target ${targetUuid}`
    );
  }

  const phase = xcodeProject.hash.project.objects[phaseType][phaseUuid];

  // Check if file already exists in build phase
  if (phase.files) {
    const existingFile = phase.files.find((file: any) => {
      const buildFile =
        xcodeProject.hash.project.objects.PBXBuildFile[file.value];
      return buildFile && buildFile.fileRef === fileRefUuid;
    });
    if (existingFile) {
      return; // Already added
    }
  }

  // Create PBXBuildFile
  const buildFileUuid = xcodeProject.generateUuid();
  xcodeProject.hash.project.objects.PBXBuildFile[buildFileUuid] = {
    isa: 'PBXBuildFile',
    fileRef: fileRefUuid,
  };
  xcodeProject.hash.project.objects.PBXBuildFile[`${buildFileUuid}_comment`] =
    `Referenced file in ${phaseType}`;

  // Add to phase
  if (!phase.files) {
    phase.files = [];
  }
  phase.files.push({
    value: buildFileUuid,
    comment: `Referenced file`,
  });
}
