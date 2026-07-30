import type { XcodeProject } from '@expo/config-plugins';

/**
 * Build phase inspection and mutation for native targets.
 */

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

  if (!target?.buildPhases) {
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

  if (!target?.buildPhases) {
    return;
  }

  const phaseSection = xcodeProject.hash.project.objects[phaseType];
  if (!phaseSection) {
    return;
  }

  // Find matching phase UUIDs
  const phasesToRemove: string[] = [];
  for (const phase of target.buildPhases) {
    if (phaseSection[phase.value]) {
      phasesToRemove.push(phase.value);
    }
  }

  // Remove phases from target's buildPhases array
  target.buildPhases = target.buildPhases.filter(
    (phase: any) => !phasesToRemove.includes(phase.value)
  );

  // Remove phase objects and comments from section
  for (const phaseUuid of phasesToRemove) {
    delete phaseSection[phaseUuid];
    delete phaseSection[`${phaseUuid}_comment`];
  }
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

  if (!target?.buildPhases) {
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
    comment: 'Referenced file',
  });
}
