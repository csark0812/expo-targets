import type { XcodeProject } from '@expo/config-plugins';
import { IOSConfig } from '@expo/config-plugins';

import type { XcodeTarget } from './types';

/**
 * Finding, de-duplicating and relating native targets in a PBX project.
 */

export const { getProjectName, getApplicationNativeTarget } =
  IOSConfig.XcodeUtils;

/**
 * Native target names are stored quoted in the pbxproj (`"MyTarget"`), so
 * comparisons have to be made on the unquoted value — otherwise a target
 * created by a previous prebuild is never recognized and gets duplicated.
 */
function unquoteName(name: unknown): string | undefined {
  if (typeof name !== 'string') {
    return;
  }
  return name.replace(/^"|"$/g, '');
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
    if (key.endsWith('_comment')) {
      continue;
    }
    const target = pbxNativeTargetSection[key];
    if (unquoteName(target?.name) === productName) {
      return key;
    }
  }
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
    if (key.endsWith('_comment')) {
      continue;
    }
    const target = pbxNativeTargetSection[key];
    if (unquoteName(target?.name) === productName) {
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
  const [_keepTarget, ...duplicates] = allTargets;

  // biome-ignore lint/complexity/noForEach: pre-existing; prefer for-of tracked
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity; tracked for refactor
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
      if (projectKey.endsWith('_comment')) {
        continue;
      }
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
  });

  return duplicates.length;
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

  if (!mainTarget?.dependencies) {
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
  if (!xcodeProject.hash.project.objects.PBXTargetDependency) {
    xcodeProject.hash.project.objects.PBXTargetDependency = {};
  }
  if (!xcodeProject.hash.project.objects.PBXContainerItemProxy) {
    xcodeProject.hash.project.objects.PBXContainerItemProxy = {};
  }

  xcodeProject.addTargetDependency(mainTargetUuid, [dependentTargetUuid]);
}
