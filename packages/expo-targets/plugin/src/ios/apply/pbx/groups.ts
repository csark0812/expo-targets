import type { XcodeProject } from '@expo/config-plugins';
import { IOSConfig } from '@expo/config-plugins';

/**
 * PBXGroup helpers, including the virtual "expo:targets" group that holds
 * references to files living outside `ios/`.
 */

export const {
  ensureGroupRecursively,
  addResourceFileToGroup,
  addBuildSourceFileToGroup,
} = IOSConfig.XcodeUtils;

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
  if (virtualGroup?.children) {
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
