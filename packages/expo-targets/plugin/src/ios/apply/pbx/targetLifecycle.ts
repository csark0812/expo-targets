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

const unquoteSetting = unquoteName;

/**
 * Find the watchOS companion application target UUID (not the iOS host).
 * Identified by application product type + watchos SDK / WATCHOS_DEPLOYMENT_TARGET.
 */
export function findWatchCompanionTargetUuid(
  project: XcodeProject
): string | undefined {
  const xcodeProject = project as any;
  const nativeTargets = xcodeProject.hash.project.objects.PBXNativeTarget || {};
  const configLists = xcodeProject.pbxXCConfigurationList?.() || {};
  const configs = xcodeProject.pbxXCBuildConfigurationSection?.() || {};

  for (const key in nativeTargets) {
    if (key.endsWith('_comment')) {
      continue;
    }
    const target = nativeTargets[key];
    const productType = unquoteSetting(target?.productType);
    if (productType !== 'com.apple.product-type.application') {
      continue;
    }

    const listId = target?.buildConfigurationList;
    const list = configLists[listId];
    const buildConfigs = list?.buildConfigurations || [];
    const isWatchOs = buildConfigs.some((entry: { value: string }) => {
      const settings = configs[entry.value]?.buildSettings || {};
      const sdk = unquoteSetting(settings.SDKROOT);
      return (
        sdk === 'watchos' ||
        typeof settings.WATCHOS_DEPLOYMENT_TARGET === 'string'
      );
    });
    if (isWatchOs) {
      return key;
    }
  }
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

  const [_keepTarget, ...duplicates] = allTargets;

  for (const targetUuid of duplicates) {
    removeTarget(project, targetUuid);
  }

  return duplicates.length;
}

function removeTarget(project: XcodeProject, targetUuid: string): void {
  const objects = (project as any).hash.project.objects;

  if (objects.PBXNativeTarget) {
    delete objects.PBXNativeTarget[targetUuid];
    delete objects.PBXNativeTarget[`${targetUuid}_comment`];
  }

  detachTargetFromProject(objects.PBXProject, targetUuid);
  removeBuildConfigurationList(objects, targetUuid);
}

function removeBuildConfigurationList(
  objects: Record<string, any>,
  targetUuid: string
): void {
  const configListUuid =
    objects.PBXNativeTarget?.[targetUuid]?.buildConfigurationList;
  if (!(configListUuid && objects.XCConfigurationList)) {
    return;
  }

  delete objects.XCConfigurationList[configListUuid];
  delete objects.XCConfigurationList[`${configListUuid}_comment`];
}

function detachTargetFromProject(
  projectSection: Record<string, any> | undefined,
  targetUuid: string
): void {
  for (const projectKey in projectSection) {
    if (projectKey.endsWith('_comment')) {
      continue;
    }
    const projectObj = projectSection[projectKey];
    if (projectObj?.targets) {
      projectObj.targets = projectObj.targets.filter(
        (t: any) => t.value !== targetUuid
      );
    }
  }
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
